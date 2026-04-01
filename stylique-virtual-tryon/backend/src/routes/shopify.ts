import express from 'express';
import type { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getSupabase } from '../services/supabase.ts';
import {
  deleteShopifyProductFromInventory,
  exchangeShopifyOAuthCode,
  pullAllShopifyProductsAndSync,
  registerShopifyProductWebhooks,
  resolveStoreIdByShopDomain,
  syncShopifyProductToInventory,
  type ShopifyRestProduct,
} from '../services/shopifySync.ts';
import { injectStyliqueSectionIntoTheme } from '../services/shopifyThemeInjector.ts';

const router: Router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'stylique-dev-secret-change-me';
const SALT_ROUNDS = 10;

const DEFAULT_SCOPES =
  process.env.SHOPIFY_SCOPES || 'read_products,write_products';

function normalizeShopParam(shop: string): string | null {
  const host = shop
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0];
  if (!host) return null;
  const s = host.replace(/\.+$/, '');
  if (!s) return null;
  if (s.endsWith('.myshopify.com')) return s;
  if (!s.includes('.')) return `${s}.myshopify.com`;
  return s;
}

function redirectUri(): string {
  return (
    process.env.SHOPIFY_REDIRECT_URI ||
    `${process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5000}`}/api/shopify/callback`
  );
}

function webhookBaseUrl(): string {
  return (process.env.PUBLIC_API_URL || process.env.SHOPIFY_WEBHOOK_BASE_URL || '').replace(/\/$/, '') ||
    `http://localhost:${process.env.PORT || 5000}`;
}

function successRedirectUrl(): string {
  const base = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/dashboard?shopify=connected`;
}

function errorRedirectUrl(message: string): string {
  const base = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/dashboard?shopify=error&reason=${encodeURIComponent(message)}`;
}

interface OAuthStatePayload {
  shop: string;
  linkStoreId?: string;
}

function signOAuthState(payload: OAuthStatePayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

function verifyOAuthState(token: string): OAuthStatePayload {
  const decoded = jwt.verify(token, JWT_SECRET) as OAuthStatePayload;
  if (!decoded?.shop) throw new Error('Invalid state');
  return decoded;
}

function optionalAuthStoreId(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const t = header.slice(7);
      const d = jwt.verify(t, JWT_SECRET) as { storeId?: string };
      return d.storeId;
    } catch {
      return undefined;
    }
  }
  const q = req.query.token as string | undefined;
  if (q) {
    try {
      const d = jwt.verify(q, JWT_SECRET) as { storeId?: string };
      return d.storeId;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

// GET /api/shopify/oauth — redirect to Shopify authorize URL
router.get('/shopify/oauth', (req: Request, res: Response) => {
  const apiKey = process.env.SHOPIFY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'SHOPIFY_API_KEY is not configured' });
  }

  const shopRaw = req.query.shop as string | undefined;
  if (!shopRaw) {
    return res.status(400).json({ error: 'Missing query: shop (e.g. your-store.myshopify.com)' });
  }

  const shop = normalizeShopParam(shopRaw);
  if (!shop || !shop.endsWith('.myshopify.com')) {
    return res.status(400).json({ error: 'Invalid shop. Use your-store.myshopify.com' });
  }

  const linkStoreId = optionalAuthStoreId(req);
  const statePayload: OAuthStatePayload = { shop };
  if (linkStoreId) statePayload.linkStoreId = linkStoreId;
  const state = signOAuthState(statePayload);
  const rd = redirectUri();
  const scopes = encodeURIComponent(DEFAULT_SCOPES);
  const authorizeUrl =
    `https://${shop}/admin/oauth/authorize?` +
    `client_id=${encodeURIComponent(apiKey)}` +
    `&scope=${scopes}` +
    `&redirect_uri=${encodeURIComponent(rd)}` +
    `&state=${encodeURIComponent(state)}`;

  console.log('[Shopify OAuth] Redirecting to authorize for shop:', shop, linkStoreId ? `(link store ${linkStoreId})` : '');
  res.redirect(302, authorizeUrl);
});

// GET /api/shopify/callback — exchange code, save token, pull products, register webhooks
router.get('/shopify/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  const shop = req.query.shop as string | undefined;
  const state = req.query.state as string | undefined;

  if (!code || !shop || !state) {
    return res.redirect(302, errorRedirectUrl('missing_code_or_shop'));
  }

  const normalizedShop = normalizeShopParam(shop);
  if (!normalizedShop) {
    return res.redirect(302, errorRedirectUrl('invalid_shop'));
  }

  let statePayload: OAuthStatePayload;
  try {
    statePayload = verifyOAuthState(state);
  } catch {
    return res.redirect(302, errorRedirectUrl('invalid_state'));
  }

  if (statePayload.shop !== normalizedShop) {
    return res.redirect(302, errorRedirectUrl('shop_mismatch'));
  }

  let access_token: string;
  try {
    const exchanged = await exchangeShopifyOAuthCode(normalizedShop, code);
    access_token = exchanged.access_token;
    console.log('[Shopify OAuth] Token exchanged for', normalizedShop);
  } catch (e: any) {
    console.error('[Shopify OAuth] Token exchange failed:', e.message);
    return res.redirect(302, errorRedirectUrl(e.message || 'token_exchange_failed'));
  }

  const supabase = getSupabase();
  let storeUuid: string | null = null;

  if (statePayload.linkStoreId) {
    const { data: row, error } = await supabase
      .from('stores')
      .select('id')
      .eq('id', statePayload.linkStoreId)
      .maybeSingle();
    if (error || !row) {
      return res.redirect(302, errorRedirectUrl('store_not_found'));
    }
    const { error: upErr } = await supabase
      .from('stores')
      .update({
        shopify_access_token: access_token,
        shopify_shop_domain: normalizedShop,
      })
      .eq('id', row.id);
    if (upErr) {
      console.error('[Shopify OAuth] Failed to save token:', upErr.message);
      return res.redirect(302, errorRedirectUrl('db_update_failed'));
    }
    storeUuid = row.id;
    console.log('[Shopify OAuth] Linked Shopify to existing store', storeUuid);
  } else {
    const { data: existing } = await supabase
      .from('stores')
      .select('id')
      .eq('store_id', normalizedShop)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('stores')
        .update({
          shopify_access_token: access_token,
          shopify_shop_domain: normalizedShop,
        })
        .eq('id', existing.id);
      storeUuid = existing.id;
      console.log('[Shopify OAuth] Updated existing store by store_id match');
    } else {
      const randomHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS);
      const name = normalizedShop.replace('.myshopify.com', '');
      const { data: created, error: insErr } = await supabase
        .from('stores')
        .insert({
          store_name: name,
          store_id: normalizedShop,
          password_hash: randomHash,
          shopify_access_token: access_token,
          shopify_shop_domain: normalizedShop,
          subscription_name: 'FREE',
          tryons_quota: 100,
          tryons_used: 0,
        })
        .select('id')
        .single();
      if (insErr || !created) {
        console.error('[Shopify OAuth] Create store failed:', insErr?.message);
        return res.redirect(302, errorRedirectUrl('create_store_failed'));
      }
      storeUuid = created.id;
      console.log('[Shopify OAuth] Created new store for Shopify shop');
    }
  }

  try {
    await pullAllShopifyProductsAndSync(normalizedShop, access_token, storeUuid!);
  } catch (e: any) {
    console.error('[Shopify OAuth] Product pull error:', e.message);
  }

  try {
    await registerShopifyProductWebhooks(normalizedShop, access_token, webhookBaseUrl());
  } catch (e: any) {
    console.error('[Shopify OAuth] Webhook registration error:', e.message);
  }

  try {
    await injectStyliqueSectionIntoTheme(normalizedShop, access_token, storeUuid!);
  } catch (e: any) {
    console.error('[Shopify OAuth] Theme injection error (non-fatal):', e.message);
  }

  res.redirect(302, successRedirectUrl());
});

function verifyShopifyWebhookHmac(rawBody: Buffer, hmacHeader: string | undefined): boolean {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret || !hmacHeader) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  try {
    const a = Buffer.from(digest, 'utf8');
    const b = Buffer.from(hmacHeader, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// POST /api/webhooks/shopify — registered in index.ts BEFORE express.json() with express.raw()
export async function shopifyWebhookHandler(req: Request, res: Response): Promise<void> {
  const buf = req.body as Buffer;
  const hmac = req.get('X-Shopify-Hmac-Sha256');
  if (!verifyShopifyWebhookHmac(buf, hmac)) {
    console.warn('[Shopify Webhook] HMAC verification failed');
    res.status(401).send('Unauthorized');
    return;
  }

  const shopDomain = req.get('X-Shopify-Shop-Domain');
  if (!shopDomain) {
    res.status(400).send('Missing shop domain');
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(buf.toString('utf8')) as Record<string, unknown>;
  } catch {
    res.status(400).send('Invalid JSON');
    return;
  }

  const topic = req.get('X-Shopify-Topic') || '';

  try {
    if (topic === 'products/delete') {
      const id = Number(body.id);
      if (Number.isFinite(id)) {
        await deleteShopifyProductFromInventory(shopDomain, id);
      }
    } else if (topic === 'products/create' || topic === 'products/update') {
      const product = body as unknown as ShopifyRestProduct;
      if (product?.id && product.handle) {
        const storeUuid = await resolveStoreIdByShopDomain(shopDomain);
        if (!storeUuid) {
          console.warn('[Shopify Webhook] No store for shop', shopDomain);
          res.status(404).send('Store not found');
          return;
        }
        await syncShopifyProductToInventory(storeUuid, shopDomain, product);
      }
    } else {
      console.log('[Shopify Webhook] Ignoring topic:', topic);
    }
  } catch (e: any) {
    console.error('[Shopify Webhook] Handler error:', e.message);
    res.status(500).send('Error');
    return;
  }

  res.status(200).send('OK');
}

export default router;
