import express from 'express';
import type { Router, Request, Response } from 'express';
import { getSupabase } from '../services/supabase.ts';
import { processProductImages } from './images.ts';
import { stripHtmlTags, parseSizeChart } from '../utils/htmlUtils.ts';
import { requireAuth, requireSyncSecret, type AuthenticatedRequest } from '../middleware/auth.ts';

const router: Router = express.Router();

function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function normalizeHost(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, '').replace(/\.+$/, '');
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

// POST /api/sync/woocommerce
router.post('/sync/woocommerce', requireSyncSecret, async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const payload: WooCommerceWebhookPayload = req.body;

    console.log('[WooCommerce Sync] Received request');
    console.log('[WooCommerce Sync] store_domain:', payload.store_domain);
    console.log('[WooCommerce Sync] product:', payload.product?.name, 'id:', payload.product?.id);

    // Extract store domain
    const storeDomain = payload.store_domain;
    if (!storeDomain) {
      console.log('[WooCommerce Sync] ERROR: Missing store_domain');
      return res.status(400).json({
        error: 'Missing store_domain in webhook payload',
      });
    }

    // Find store by domain
    console.log('[WooCommerce Sync] Looking up store with store_id =', storeDomain);
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('store_id', storeDomain)
      .single();

    if (storeError || !store) {
      console.log('[WooCommerce Sync] Store NOT FOUND for domain:', storeDomain, 'error:', storeError?.message);
      return res.status(404).json({
        error: 'Store not found',
        details: `No store found with domain: ${storeDomain}`,
      });
    }

    console.log('[WooCommerce Sync] Store found, UUID:', store.id);

    const product = payload.product;
    const row = await syncWooCommerceProductToInventory(store.id, storeDomain, product);

    if (!row) {
      return res.status(500).json({
        error: 'Failed to sync product to inventory',
      });
    }

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
