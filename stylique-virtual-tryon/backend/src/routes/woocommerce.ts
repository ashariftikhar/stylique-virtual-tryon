import express from 'express';
import type { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getSupabase } from '../services/supabase.ts';
import { processProductImages } from './images.ts';
import { stripHtmlTags, parseSizeChart } from '../utils/htmlUtils.ts';
import { getJwtSecret, requireAuth, type AuthenticatedRequest } from '../middleware/auth.ts';

const router: Router = express.Router();
const SALT_ROUNDS = 10;

function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function normalizeHost(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, '').replace(/\.+$/, '');
}

function parseSiteUrl(value: string | undefined): URL | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}

function storeNameFromDomain(domain: string): string {
  const firstPart = domain.split('.')[0] ?? domain;
  return firstPart
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) || domain;
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
}

function getGlobalSyncSecret(): string | undefined {
  return process.env.SYNC_API_SECRET || process.env.STYLIQUE_SYNC_SECRET;
}

function getProvidedSyncSecret(req: Request): string | undefined {
  return (
    req.get('X-Stylique-Sync-Secret') ||
    req.get('X-Webhook-Secret') ||
    req.get('X-Sync-Secret') ||
    undefined
  );
}

async function verifyWooCommerceSyncSecret(
  req: Request,
  storeDomain: string,
  storeSecretHash?: string | null,
): Promise<{ ok: true; usedGlobalFallback: boolean } | { ok: false; error: string; message: string }> {
  const providedSecret = getProvidedSyncSecret(req);
  if (!providedSecret) {
    return {
      ok: false,
      error: 'missing_secret',
      message: 'Missing WooCommerce sync secret',
    };
  }

  if (storeSecretHash) {
    try {
      const validStoreSecret = await bcrypt.compare(providedSecret, storeSecretHash);
      if (validStoreSecret) {
        return { ok: true, usedGlobalFallback: false };
      }
    } catch (error: any) {
      console.error(`[WooCommerce Sync] Failed to verify store secret for ${storeDomain}:`, error.message);
    }
  }

  const globalSecret = getGlobalSyncSecret();
  if (globalSecret && timingSafeStringEqual(providedSecret, globalSecret)) {
    console.warn(
      `[WooCommerce Sync] Deprecated global sync secret fallback used for ${storeDomain}. Reconnect the WordPress plugin to use a per-store secret.`,
    );
    return { ok: true, usedGlobalFallback: true };
  }

  return {
    ok: false,
    error: 'invalid_secret',
    message: 'Invalid WooCommerce sync secret',
  };
}

async function updateWooCommerceSyncStatus(
  storeUuid: string,
  status: string,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('stores')
    .update({
      woocommerce_last_sync_at: new Date().toISOString(),
      woocommerce_last_sync_status: status.slice(0, 500),
    })
    .eq('id', storeUuid);

  if (error) {
    console.error('[WooCommerce Sync] Failed to update sync status:', error.message);
  }
}

interface WooCommerceConnectPayload {
  store_domain?: string;
  site_url?: string;
  store_name?: string;
  admin_email?: string | null;
  plugin_version?: string;
}

/**
 * Helper: sync a single product from WooCommerce data to inventory
 */
async function syncWooCommerceProductToInventory(
  storeUUID: string,
  storeDomain: string,
  product: WooCommerceProduct,
): Promise<{ id: string } | null> {
  const supabase = getSupabase();
  const productName = product.name;
  const description = stripHtmlTags(product.description || '');
  const price = product.price || '0';
  const imageUrl = product.images?.[0]?.src || '';

  // Extract ALL image URLs for carousel (Tier 1/2)
  const allImageUrls: string[] = (product.images || [])
    .map((img: WooCommerceImage) => img.src)
    .filter((url: string) => url && url.startsWith('http'));

  // Extract size chart from meta data
  const measurements = extractWooCommerceSizeChart(product.meta_data);

  // Extract sizes from variant attributes
  const sizes: string[] = [];
  product.variants?.forEach((variant) => {
    variant.attributes?.forEach((attr) => {
      if (attr.name.toLowerCase() === 'size' && !sizes.includes(attr.option)) {
        sizes.push(attr.option);
      }
    });
  });

  // If no sizes from variants but we have measurements (size chart), extract sizes from measurement keys
  const finalSizes = sizes.length > 0 ? sizes : Object.keys(measurements).length > 0 ? Object.keys(measurements).sort() : [];
  if (finalSizes.length > 0 && sizes.length === 0 && Object.keys(measurements).length > 0) {
    console.log(`[WooCommerce] No variant sizes found, extracted from measurements: ${finalSizes.join(', ')}`);
  }

  const baseRecord: Record<string, unknown> = {
    store_id: storeUUID,
    product_name: productName,
    description,
    price: parseFloat(price),
    image_url: imageUrl,
    sizes: finalSizes.length > 0 ? finalSizes : [],
    measurements: Object.keys(measurements).length > 0 ? measurements : {},
    product_link: product.permalink,
    images: allImageUrls,
  };

  // Look up existing product — try woocommerce_product_id first, then permalink
  let existing: { id: string } | null = null;
  let hasWooColumn = true;
  try {
    const { data: byWoo, error: wooErr } = await supabase
      .from('inventory')
      .select('id')
      .eq('store_id', storeUUID)
      .eq('woocommerce_product_id', product.id)
      .maybeSingle();
    if (wooErr && /woocommerce_product_id|schema|column/i.test(wooErr.message)) {
      hasWooColumn = false;
    } else {
      existing = byWoo;
    }
  } catch {
    hasWooColumn = false;
  }

  if (!existing) {
    const { data: byLink } = await supabase
      .from('inventory')
      .select('id')
      .eq('store_id', storeUUID)
      .eq('product_link', product.permalink)
      .maybeSingle();
    existing = byLink;
  }

  const inventoryRecord = hasWooColumn
    ? { ...baseRecord, woocommerce_product_id: product.id }
    : baseRecord;

  let data: { id: string } | null = null;
  let error: any = null;

  if (existing) {
    const result = await supabase
      .from('inventory')
      .update(inventoryRecord)
      .eq('id', existing.id)
      .select('id')
      .single();
    data = result.data;
    error = result.error;
  } else {
    let result = await supabase
      .from('inventory')
      .insert([inventoryRecord])
      .select('id')
      .single();
    // If insert fails because woocommerce_product_id column is missing, retry without it
    if (result.error && /woocommerce_product_id|column/i.test(result.error.message)) {
      result = await supabase
        .from('inventory')
        .insert([baseRecord])
        .select('id')
        .single();
    }
    data = result.data;
    error = result.error;
  }

  if (error || !data) {
    console.error(`[WooCommerce] Sync failed for product ${product.id}: ${error?.message}`);
    return null;
  }

  // Auto-process images in the background
  const allImages = (product.images || []).map((img: WooCommerceImage) => ({
    url: img.src,
    alt: img.alt || product.name,
  }));

  if (data.id && allImages.length > 0) {
    processProductImages(data.id, allImages).catch(err =>
      console.error(`[WooCommerce] Background image processing failed for ${data.id}:`, err.message),
    );
  } else if (data.id && allImages.length === 0) {
    await supabase.from('inventory').update({ tier: 3, tryon_image_url: null }).eq('id', data.id);
  }

  return data;
}

/**
 * Extract size chart from WooCommerce product meta data.
 * Tries common meta keys: _size_chart, _wc_size_chart, size_chart, wc_size_chart
 * Returns parsed size chart object or empty object if not found.
 */
function extractWooCommerceSizeChart(
  metaData: Array<{ key: string; value: any }> | undefined,
): Record<string, Record<string, number>> {
  if (!metaData || !Array.isArray(metaData)) {
    console.log('[WooCommerce] No meta_data array provided');
    return {};
  }

  // List of keys to check for size chart data (in priority order)
  const sizeChartKeys = ['_size_chart', '_wc_size_chart', 'size_chart', 'wc_size_chart'];

  for (const key of sizeChartKeys) {
    const metaEntry = metaData.find((m) => m.key === key);
    if (metaEntry && metaEntry.value) {
      console.log(`[WooCommerce] Found size chart in meta key: ${key}`);
      const parsed = parseSizeChart(metaEntry.value);
      if (Object.keys(parsed).length > 0) {
        console.log(
          `[WooCommerce] Successfully parsed size_chart with ${Object.keys(parsed).length} sizes`,
        );
        return parsed;
      } else {
        console.warn(
          `[WooCommerce] size chart meta found at key "${key}" but could not parse: ${String(metaEntry.value).slice(
            0,
            100,
          )}`,
        );
      }
    }
  }

  console.log('[WooCommerce] No size chart found in meta keys:', sizeChartKeys.join(', '));
  return {};
}

interface WooCommerceImage {

  src: string;
  alt?: string;
}

interface WooCommerceVariant {
  price: string;
  attributes?: Array<{ name: string; option: string }>;
}

interface WooCommerceProduct {
  id: number;
  name: string;
  description: string;
  price: string;
  images: WooCommerceImage[];
  variants: WooCommerceVariant[];
  permalink: string;
  meta_data?: Array<{ key: string; value: any }>;
}

interface WooCommerceWebhookPayload {
  store_domain: string;
  product: WooCommerceProduct;
}

// POST /api/woocommerce/connect
// Called by the WordPress plugin during first-time setup. It creates or updates
// the store, then returns one-time credentials and a per-store sync secret.
router.post('/woocommerce/connect', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const payload: WooCommerceConnectPayload = req.body || {};
    const parsedSiteUrl = parseSiteUrl(payload.site_url || payload.store_domain);

    if (!parsedSiteUrl) {
      return res.status(400).json({
        success: false,
        error: 'invalid_site_url',
        message: 'A valid WordPress site URL or store domain is required',
      });
    }

    const storeId = normalizeHost(parsedSiteUrl.hostname);
    if (!storeId || !storeId.includes('.')) {
      return res.status(400).json({
        success: false,
        error: 'invalid_store_domain',
        message: 'Store domain must be a valid hostname',
      });
    }

    const siteUrl = parsedSiteUrl.origin;
    const storeName = String(payload.store_name || '').trim() || storeNameFromDomain(storeId);
    const adminEmail = payload.admin_email ? String(payload.admin_email).trim() : null;
    const plainPassword = crypto.randomBytes(6).toString('hex');
    const syncSecret = crypto.randomBytes(32).toString('hex');
    const [passwordHash, syncSecretHash] = await Promise.all([
      bcrypt.hash(plainPassword, SALT_ROUNDS),
      bcrypt.hash(syncSecret, SALT_ROUNDS),
    ]);

    const { data: existing, error: existingError } = await supabase
      .from('stores')
      .select('id')
      .eq('store_id', storeId)
      .maybeSingle();

    if (existingError) {
      console.error('[WooCommerce Connect] Store lookup failed:', existingError.message);
      return res.status(500).json({
        success: false,
        error: 'store_lookup_failed',
        message: 'Unable to check existing store',
      });
    }

    const storeFields = {
      store_name: storeName,
      store_id: storeId,
      email: adminEmail || null,
      password_hash: passwordHash,
      woocommerce_site_url: siteUrl,
      woocommerce_sync_secret_hash: syncSecretHash,
      woocommerce_connected_at: new Date().toISOString(),
      woocommerce_last_sync_status: 'Connected; product sync not run yet',
    };

    let store: { id: string; store_id: string; store_name: string } | null = null;
    let dbError: { message: string } | null = null;

    if (existing?.id) {
      const result = await supabase
        .from('stores')
        .update(storeFields)
        .eq('id', existing.id)
        .select('id, store_id, store_name')
        .single();
      store = result.data;
      dbError = result.error;
    } else {
      const result = await supabase
        .from('stores')
        .insert({
          ...storeFields,
          subscription_name: 'FREE',
          tryons_quota: 100,
          tryons_used: 0,
        })
        .select('id, store_id, store_name')
        .single();
      store = result.data;
      dbError = result.error;
    }

    if (dbError || !store) {
      console.error('[WooCommerce Connect] Store save failed:', dbError?.message);
      return res.status(500).json({
        success: false,
        error: 'store_save_failed',
        message: 'Unable to save WooCommerce store connection',
      });
    }

    const token = jwt.sign(
      { storeId: store.id, store_id: store.store_id },
      getJwtSecret(),
      { expiresIn: '7d' },
    );
    const storePanelUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

    console.log(
      `[WooCommerce Connect] ${existing?.id ? 'Updated' : 'Created'} store ${store.store_id} (${store.id}) from plugin ${payload.plugin_version || 'unknown'}`,
    );

    return res.status(existing?.id ? 200 : 201).json({
      success: true,
      store_id: store.store_id,
      store_uuid: store.id,
      store_name: store.store_name,
      store_panel_url: storePanelUrl,
      token,
      password_once: plainPassword,
      sync_secret: syncSecret,
    });
  } catch (error: any) {
    console.error('[WooCommerce Connect] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: 'Unable to connect WooCommerce store',
    });
  }
});

// POST /api/sync/woocommerce
router.post('/sync/woocommerce', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const payload: WooCommerceWebhookPayload = req.body;

    console.log('[WooCommerce Sync] Received request');
    console.log('[WooCommerce Sync] store_domain:', payload?.store_domain);
    console.log('[WooCommerce Sync] product:', payload?.product?.name, 'id:', payload?.product?.id);

    // Extract store domain
    const storeDomain = payload?.store_domain ? normalizeHost(String(payload.store_domain)) : '';
    if (!storeDomain) {
      console.log('[WooCommerce Sync] ERROR: Missing store_domain');
      return res.status(400).json({
        error: 'missing_domain',
        message: 'Missing store_domain in WooCommerce sync payload',
      });
    }

    // Find store by domain
    console.log('[WooCommerce Sync] Looking up store with store_id =', storeDomain);
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, woocommerce_sync_secret_hash')
      .eq('store_id', storeDomain)
      .maybeSingle();

    if (storeError || !store) {
      console.log('[WooCommerce Sync] Store NOT FOUND for domain:', storeDomain, 'error:', storeError?.message);
      return res.status(404).json({
        error: 'store_not_found',
        message: 'Store not found for WooCommerce sync',
        details: `No store found with domain: ${storeDomain}`,
      });
    }

    const secretResult = await verifyWooCommerceSyncSecret(
      req,
      storeDomain,
      store.woocommerce_sync_secret_hash,
    );
    if (!secretResult.ok) {
      return res.status(401).json({
        error: secretResult.error,
        message: secretResult.message,
      });
    }

    if (!payload?.product || !payload.product.id || !payload.product.name) {
      await updateWooCommerceSyncStatus(store.id, 'Failed: invalid product payload');
      return res.status(400).json({
        error: 'invalid_payload',
        message: 'WooCommerce sync payload must include product id and name',
      });
    }

    console.log('[WooCommerce Sync] Store found, UUID:', store.id);

    const product = payload.product;
    const row = await syncWooCommerceProductToInventory(store.id, storeDomain, product);

    if (!row) {
      await updateWooCommerceSyncStatus(store.id, `Failed: product ${product.id} could not be synced`);
      return res.status(500).json({
        error: 'Failed to sync product to inventory',
      });
    }

    await updateWooCommerceSyncStatus(store.id, `Synced product ${product.id}: ${product.name}`);

    res.status(200).json({
      status: 'success',
      message: 'WooCommerce product synced successfully',
      product: {
        name: product.name,
        link: product.permalink,
        sizes: product.variants && product.variants.length > 0
          ? Array.from(new Set(
              product.variants.flatMap((v) =>
                v.attributes?.filter((a) => a.name.toLowerCase() === 'size').map((a) => a.option) || []
              )
            )).sort()
          : Object.keys(extractWooCommerceSizeChart(product.meta_data)).sort(),
      },
    });
  } catch (error: any) {
    console.error('Error syncing WooCommerce product:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
});


// POST /api/woocommerce/bulk-sync
// Fetches all products from WooCommerce and syncs them to inventory
// Body: { store_id: string, woocommerce_url?: string, consumer_key?: string, consumer_secret?: string }
router.post('/woocommerce/bulk-sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const authStoreId = (req as AuthenticatedRequest).storeAuth?.storeId;
    const { store_id, woocommerce_url, consumer_key, consumer_secret } = req.body;

    if (!authStoreId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!store_id) {
      return res.status(400).json({
        error: 'Missing store_id in request',
      });
    }

    console.log('[WooCommerce BulkSync] Starting bulk sync for store:', store_id);

    // Find store by UUID or domain, then enforce that it belongs to the authenticated token.
    let storeQuery = supabase
      .from('stores')
      .select('id, store_id')
      .limit(1);

    storeQuery = isUUID(store_id) ? storeQuery.eq('id', store_id) : storeQuery.eq('store_id', store_id);
    const { data: store, error: storeError } = await storeQuery.maybeSingle();

    if (storeError || !store) {
      console.log('[WooCommerce BulkSync] Store NOT FOUND for store_id:', store_id);
      return res.status(404).json({
        error: 'Store not found',
        details: `No store found with store_id: ${store_id}`,
      });
    }

    if (store.id !== authStoreId) {
      return res.status(403).json({ error: 'Forbidden for this store' });
    }

    // Determine WooCommerce URL
    let apiBaseUrl = woocommerce_url || `https://${store.store_id}`;
    if (!apiBaseUrl.startsWith('http')) {
      apiBaseUrl = `https://${apiBaseUrl}`;
    }
    let parsedBaseUrl: URL;
    try {
      parsedBaseUrl = new URL(apiBaseUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid woocommerce_url' });
    }

    if (normalizeHost(parsedBaseUrl.hostname) !== normalizeHost(store.store_id)) {
      return res.status(400).json({
        error: 'woocommerce_url host must match the registered store domain',
      });
    }

    apiBaseUrl = parsedBaseUrl.origin;

    const productsUrl = `${apiBaseUrl}/wp-json/wc/v3/products`;
    console.log('[WooCommerce BulkSync] Fetching products from:', productsUrl);

    let synced = 0;
    let failed = 0;
    let page = 1;
    const per_page = 100;

    while (true) {
      try {
        const fetchUrl = `${productsUrl}?page=${page}&per_page=${per_page}`;
        const fetchHeaders: Record<string, string> = {
          Accept: 'application/json',
        };

        // Add Basic Auth if credentials provided
        if (consumer_key && consumer_secret) {
          const credentials = Buffer.from(`${consumer_key}:${consumer_secret}`).toString('base64');
          fetchHeaders['Authorization'] = `Basic ${credentials}`;
        }

        console.log(`[WooCommerce BulkSync] Fetching page ${page} from ${fetchUrl}`);
        const res = await fetch(fetchUrl, { headers: fetchHeaders });

        if (!res.ok) {
          const text = await res.text();
          console.error(`[WooCommerce BulkSync] Failed to fetch page ${page}: ${res.status} ${text.slice(0, 200)}`);
          // If we get a 401/403 without credentials, stop here
          if ((res.status === 401 || res.status === 403) && !consumer_key) {
            console.log('[WooCommerce BulkSync] API requires authentication. Provide consumer_key and consumer_secret.');
            break;
          }
          // Otherwise, continue to next page
          page++;
          continue;
        }

        const data = (await res.json()) as WooCommerceProduct[];
        if (!Array.isArray(data) || data.length === 0) {
          console.log(`[WooCommerce BulkSync] No more products on page ${page}`);
          break;
        }

        console.log(`[WooCommerce BulkSync] Page ${page}: Got ${data.length} products`);

        for (const product of data) {
          try {
            const row = await syncWooCommerceProductToInventory(store.id, store.store_id, product);
            if (row) {
              synced++;
              console.log(`[WooCommerce BulkSync] Synced product ${product.id}: ${product.name}`);
            } else {
              failed++;
              console.error(`[WooCommerce BulkSync] Failed to sync product ${product.id}: ${product.name}`);
            }
          } catch (err: any) {
            failed++;
            console.error(`[WooCommerce BulkSync] Error syncing product ${product.id}:`, err.message);
          }
        }

        page++;
      } catch (pageErr: any) {
        console.error(`[WooCommerce BulkSync] Error processing page ${page}:`, pageErr.message);
        break;
      }
    }

    console.log(`[WooCommerce BulkSync] Complete: synced=${synced} failed=${failed}`);

    res.status(200).json({
      status: 'success',
      message: 'WooCommerce bulk sync completed',
      results: {
        synced,
        failed,
        total: synced + failed,
      },
    });
  } catch (error: any) {
    console.error('Error in bulk sync:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
});

export default router;
