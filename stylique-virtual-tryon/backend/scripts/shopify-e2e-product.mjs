#!/usr/bin/env node
/**
 * End-to-end check after Shopify OAuth:
 * 1) Resolve Admin API token + shop (from .env or Supabase `stores`).
 * 2) Create a draft product via Admin REST API.
 * 3) Poll Supabase `inventory` for a row with matching `shopify_product_id` (webhook → handler → DB).
 *
 * Prerequisites:
 * - OAuth completed so `stores.shopify_access_token` is set (or set SHOPIFY_ACCESS_TOKEN in .env).
 * - Backend reachable at PUBLIC_API_URL with POST /api/webhooks/shopify (e.g. ngrok + server running).
 * - Webhooks registered (happens on OAuth callback).
 *
 * Usage (from backend/):
 *   node scripts/shopify-e2e-product.mjs
 *   node scripts/shopify-e2e-product.mjs --cleanup   # delete the test product in Shopify after verify
 *
 * Env:
 *   SHOPIFY_SHOP_DOMAIN   — required (e.g. your-store.myshopify.com)
 *   SHOPIFY_ACCESS_TOKEN  — optional; if omitted, loaded from Supabase stores row for that shop
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY — required when token not in .env
 *   SHOPIFY_API_VERSION   — optional, default 2024-10
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 90_000;

function normalizeShop(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const host = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    ?.replace(/\.+$/, '');
  if (!host) return null;
  if (host.endsWith('.myshopify.com')) return host;
  if (!host.includes('.')) return `${host}.myshopify.com`;
  return host;
}

function parseArgs() {
  return { cleanup: process.argv.includes('--cleanup') };
}

async function resolveCredentials() {
  const shop = normalizeShop(process.env.SHOPIFY_SHOP_DOMAIN || process.env.SHOPIFY_SHOP);
  if (!shop) {
    throw new Error('Set SHOPIFY_SHOP_DOMAIN (or SHOPIFY_SHOP) in .env, e.g. your-store.myshopify.com');
  }

  let accessToken = process.env.SHOPIFY_ACCESS_TOKEN?.trim() || '';
  let storeUuid = null;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!accessToken) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'SHOPIFY_ACCESS_TOKEN is empty and Supabase is not configured. Paste the offline token into SHOPIFY_ACCESS_TOKEN or set SUPABASE_URL + SUPABASE_SERVICE_KEY.',
      );
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: row, error } = await supabase
      .from('stores')
      .select('id, shopify_access_token, shopify_shop_domain')
      .eq('shopify_shop_domain', shop)
      .maybeSingle();

    if (error) throw new Error(`Supabase stores lookup failed: ${error.message}`);
    if (!row?.shopify_access_token) {
      throw new Error(
        `No shopify_access_token for ${shop}. Complete OAuth first or set SHOPIFY_ACCESS_TOKEN in .env.`,
      );
    }
    accessToken = row.shopify_access_token;
    storeUuid = row.id;
  } else if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: row, error } = await supabase
      .from('stores')
      .select('id')
      .eq('shopify_shop_domain', shop)
      .maybeSingle();
    if (error) throw new Error(`Supabase stores lookup failed: ${error.message}`);
    storeUuid = row?.id ?? null;
  }

  return { shop, accessToken, storeUuid, supabaseUrl, supabaseKey };
}

async function createTestProduct(shop, accessToken) {
  const title = `Stylique E2E ${new Date().toISOString()}`;
  const url = `https://${shop}/admin/api/${API_VERSION}/products.json`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({
      product: {
        title,
        body_html: '<p>Created by backend/scripts/shopify-e2e-product.mjs</p>',
        vendor: 'Stylique',
        product_type: 'E2E Test',
        status: 'draft',
        variants: [{ price: '19.99' }],
      },
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.errors ? JSON.stringify(body.errors) : JSON.stringify(body);
    throw new Error(`Create product failed (${res.status}): ${msg}`);
  }
  const id = body.product?.id;
  if (!id) throw new Error('Create product: missing product.id in response');
  return { productId: id, title: body.product.title || title };
}

async function deleteProduct(shop, accessToken, productId) {
  const url = `https://${shop}/admin/api/${API_VERSION}/products/${productId}.json`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
  });
  if (!res.ok) {
    const t = await res.text();
    console.warn(`[cleanup] DELETE product ${productId} failed: ${res.status} ${t.slice(0, 200)}`);
  } else {
    console.log(`[cleanup] Deleted Shopify product ${productId}`);
  }
}

async function waitForInventoryRow(supabase, storeUuid, shopifyProductId, productTitle) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  const pid = String(shopifyProductId);

  while (Date.now() < deadline) {
    let q = supabase.from('inventory').select('id, product_name, shopify_product_id').eq('shopify_product_id', pid);
    if (storeUuid) q = q.eq('store_id', storeUuid);

    const { data, error } = await q.maybeSingle();
    if (error) {
      console.warn('[poll] Supabase error:', error.message);
    } else if (data) {
      return data;
    }

    const elapsed = Math.round((deadline - Date.now()) / 1000);
    console.log(
      `[poll] No inventory row yet for shopify_product_id=${pid} (${productTitle}). Retrying… (~${elapsed}s left)`,
    );
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  return null;
}

async function main() {
  const { cleanup } = parseArgs();
  console.log('[e2e] Resolving credentials…');
  const { shop, accessToken, storeUuid, supabaseUrl, supabaseKey } = await resolveCredentials();

  if (!storeUuid && supabaseUrl && supabaseKey) {
    console.warn('[e2e] No store UUID in DB for this shop; polling inventory by shopify_product_id only.');
  } else if (storeUuid) {
    console.log('[e2e] Store UUID:', storeUuid);
  }

  console.log('[e2e] Creating draft product via Admin API…');
  const { productId, title } = await createTestProduct(shop, accessToken);
  console.log(`[e2e] Created Shopify product id=${productId} title="${title}"`);

  if (!supabaseUrl || !supabaseKey) {
    console.log('[e2e] Supabase not configured — cannot poll for webhook. Watch backend logs for [Shopify Webhook].');
    if (cleanup) await deleteProduct(shop, accessToken, productId);
    process.exit(0);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log(
    `[e2e] Polling inventory (webhook must hit ${process.env.PUBLIC_API_URL || '(PUBLIC_API_URL)'}/api/webhooks/shopify)…`,
  );

  const row = await waitForInventoryRow(supabase, storeUuid, productId, title);

  if (!row) {
    console.error(
      '[e2e] FAILED: No matching inventory row within timeout. Check: backend running, ngrok URL, webhooks in Shopify, HMAC secret.',
    );
    if (cleanup) await deleteProduct(shop, accessToken, productId);
    process.exit(1);
  }

  console.log('[e2e] OK: Webhook path verified — inventory row:', {
    id: row.id,
    product_name: row.product_name,
    shopify_product_id: row.shopify_product_id,
  });

  if (cleanup) await deleteProduct(shop, accessToken, productId);
  else console.log('[e2e] Product left in Shopify (draft). Re-run with --cleanup to delete.');
}

main().catch((err) => {
  console.error('[e2e] Error:', err.message || err);
  process.exit(1);
});
