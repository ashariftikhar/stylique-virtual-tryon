import { getSupabase } from './supabase.ts';
import { processProductImages } from '../routes/images.ts';

const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-10';

export interface ShopifyRestProduct {
  id: number;
  title: string;
  handle: string;
  body_html?: string | null;
  images?: Array<{ src?: string; alt?: string }>;
  variants?: Array<{
    price?: string;
    option1?: string | null;
    option2?: string | null;
    option3?: string | null;
  }>;
}

/**
 * Resolve internal store UUID by Shopify shop domain (header X-Shopify-Shop-Domain).
 */
export async function resolveStoreIdByShopDomain(shopDomain: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data: byShopify } = await supabase
    .from('stores')
    .select('id')
    .eq('shopify_shop_domain', shopDomain)
    .maybeSingle();
  if (byShopify?.id) return byShopify.id;

  const { data: byStoreId } = await supabase
    .from('stores')
    .select('id')
    .eq('store_id', shopDomain)
    .maybeSingle();
  return byStoreId?.id ?? null;
}

/**
 * Extract sizes from all variant options (option1, option2, option3).
 * Returns unique, non-null, non-empty size values.
 * Intelligently identifies size-like values (e.g., S, M, L, XS, numbers).
 */
function sizesFromVariants(product: ShopifyRestProduct): string[] {
  if (!product.variants || product.variants.length === 0) {
    return [];
  }

  // Collect all option values from all variants
  const allOptionValues = new Set<string>();

  for (const variant of product.variants) {
    // Extract option1, option2, option3
    const options = [variant.option1, variant.option2, variant.option3].filter(
      (opt): opt is string => opt != null && String(opt).trim() !== '',
    );

    for (const opt of options) {
      allOptionValues.add(opt.trim());
    }
  }

  // Convert Set to Array and return
  return Array.from(allOptionValues).sort();
}


/**
 * Upsert one Shopify product into inventory + optional image processing (same pattern as WooCommerce).
 */
export async function syncShopifyProductToInventory(
  storeUuid: string,
  shopDomain: string,
  product: ShopifyRestProduct,
): Promise<{ id: string } | null> {
  const supabase = getSupabase();
  const productName = product.title || 'Untitled';
  const description = product.body_html || '';
  const price = parseFloat(product.variants?.[0]?.price || '0');
  const imageUrl = product.images?.[0]?.src || '';
  const sizes = sizesFromVariants(product);
  const productLink = `https://${shopDomain}/products/${product.handle}`;

  const inventoryRecord = {
    store_id: storeUuid,
    product_name: productName,
    description,
    price,
    image_url: imageUrl,
    sizes: sizes.length > 0 ? sizes : [],
    product_link: productLink,
    shopify_product_id: String(product.id),
  };

  const { data: existing } = await supabase
    .from('inventory')
    .select('id')
    .eq('store_id', storeUuid)
    .eq('shopify_product_id', String(product.id))
    .maybeSingle();

  let row: { id: string } | null = null;
  let error: { message: string } | null = null;

  if (existing) {
    const r = await supabase.from('inventory').update(inventoryRecord).eq('id', existing.id).select('id').single();
    row = r.data;
    error = r.error;
  } else {
    const { data: byLink } = await supabase
      .from('inventory')
      .select('id')
      .eq('store_id', storeUuid)
      .eq('product_link', productLink)
      .maybeSingle();
    if (byLink) {
      const r = await supabase.from('inventory').update(inventoryRecord).eq('id', byLink.id).select('id').single();
      row = r.data;
      error = r.error;
    } else {
      const r = await supabase.from('inventory').insert([inventoryRecord]).select('id').single();
      row = r.data;
      error = r.error;
    }
  }

  if (error || !row) {
    console.error('[ShopifySync] upsert failed:', error?.message);
    return null;
  }

  const allImages = (product.images || [])
    .map((img) => ({
      url: img.src || '',
      alt: img.alt || productName,
    }))
    .filter((i) => i.url);

  if (allImages.length > 0) {
    processProductImages(row.id, allImages).catch((err) =>
      console.error(`[ShopifySync] image processing failed for ${row!.id}:`, err.message),
    );
    console.log(`[ShopifySync] Triggered image processing for ${row.id} (${allImages.length} images)`);
  } else {
    await supabase.from('inventory').update({ tier: 3, tryon_image_url: null }).eq('id', row.id);
  }

  return row;
}

export async function deleteShopifyProductFromInventory(shopDomain: string, shopifyProductId: number): Promise<void> {
  const storeUuid = await resolveStoreIdByShopDomain(shopDomain);
  if (!storeUuid) {
    console.warn('[ShopifySync] delete: no store for shop', shopDomain);
    return;
  }
  const supabase = getSupabase();
  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('store_id', storeUuid)
    .eq('shopify_product_id', String(shopifyProductId));
  if (error) {
    console.error('[ShopifySync] delete failed:', error.message);
  } else {
    console.log(`[ShopifySync] Deleted inventory for Shopify product ${shopifyProductId}`);
  }
}

function parseNextProductsUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const parts = linkHeader.split(',');
  for (const part of parts) {
    const m = part.match(/<([^>]+)>;\s*rel="next"/);
    if (m?.[1]) return m[1];
  }
  return null;
}

/**
 * Fetch all products from Shopify Admin REST API and sync to inventory.
 */
export async function pullAllShopifyProductsAndSync(
  shopDomain: string,
  accessToken: string,
  storeUuid: string,
): Promise<{ synced: number; failed: number }> {
  let url: string | null =
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250`;
  let synced = 0;
  let failed = 0;

  while (url) {
    const res = await fetch(url, {
      headers: { 'X-Shopify-Access-Token': accessToken, Accept: 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[ShopifySync] products list failed:', res.status, text.slice(0, 200));
      break;
    }
    const data = (await res.json()) as { products?: ShopifyRestProduct[] };
    const products = data.products || [];
    for (const p of products) {
      const row = await syncShopifyProductToInventory(storeUuid, shopDomain, p);
      if (row) synced++;
      else failed++;
    }
    url = parseNextProductsUrl(res.headers.get('link'));
  }

  console.log(`[ShopifySync] Full pull complete: synced=${synced} failed=${failed}`);
  return { synced, failed };
}

const WEBHOOK_TOPICS = ['products/create', 'products/update', 'products/delete'] as const;

export async function registerShopifyProductWebhooks(
  shopDomain: string,
  accessToken: string,
  webhookBaseUrl: string,
): Promise<void> {
  const address = `${webhookBaseUrl.replace(/\/$/, '')}/api/webhooks/shopify`;
  const listRes = await fetch(`https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`, {
    headers: { 'X-Shopify-Access-Token': accessToken, Accept: 'application/json' },
  });
  const listJson = (await listRes.json()) as { webhooks?: Array<{ id: number; topic: string; address: string }> };
  const existing = listJson.webhooks || [];

  for (const topic of WEBHOOK_TOPICS) {
    const already = existing.some((w) => w.topic === topic && w.address === address);
    if (already) {
      console.log(`[ShopifySync] Webhook already registered: ${topic}`);
      continue;
    }
    const createRes = await fetch(`https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        webhook: { topic, address, format: 'json' },
      }),
    });
    if (!createRes.ok) {
      const t = await createRes.text();
      console.error(`[ShopifySync] Webhook register failed ${topic}:`, createRes.status, t.slice(0, 300));
    } else {
      console.log(`[ShopifySync] Registered webhook: ${topic} -> ${address}`);
    }
  }
}

export async function exchangeShopifyOAuthCode(
  shop: string,
  code: string,
): Promise<{ access_token: string; scope: string }> {
  const clientId = process.env.SHOPIFY_API_KEY;
  const clientSecret = process.env.SHOPIFY_API_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('SHOPIFY_API_KEY and SHOPIFY_API_SECRET must be set');
  }
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });
  const body = (await res.json()) as { access_token?: string; scope?: string; error?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(body.error || `Token exchange failed (${res.status})`);
  }
  return { access_token: body.access_token, scope: body.scope || '' };
}
