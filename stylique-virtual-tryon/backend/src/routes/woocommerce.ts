import express from 'express';
import type { Router, Request, Response } from 'express';
import { getSupabase } from '../services/supabase.ts';
import { processProductImages } from './images.ts';
import { stripHtmlTags, parseSizeChart } from '../utils/htmlUtils.ts';

const router: Router = express.Router();

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
router.post('/sync/woocommerce', async (req: Request, res: Response) => {
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

    // Extract product data
    const productName = product.name;
    const description = stripHtmlTags(product.description || '');
    const price = product.price || '0';
    const imageUrl = product.images?.[0]?.src || '';
    
    // Extract ALL image URLs for carousel (Tier 1/2)
    const allImageUrls: string[] = (product.images || [])
      .map((img: WooCommerceImage) => img.src)
      .filter((url: string) => url && url.startsWith('http'));
    
    console.log('[WooCommerce Sync] Found', allImageUrls.length, 'images for carousel:', allImageUrls);
    
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

    const baseRecord: Record<string, unknown> = {
      store_id: store.id,
      product_name: productName,
      description,
      price: parseFloat(price),
      image_url: imageUrl,
      sizes: sizes.length > 0 ? sizes : [],
      measurements: Object.keys(measurements).length > 0 ? measurements : {},
      product_link: product.permalink,
      images: allImageUrls, // Store all image URLs for carousel
    };

    // Look up existing product — try woocommerce_product_id first, then permalink
    let existing: { id: string } | null = null;
    let hasWooColumn = true;
    try {
      const { data: byWoo, error: wooErr } = await supabase
        .from('inventory')
        .select('id')
        .eq('store_id', store.id)
        .eq('woocommerce_product_id', product.id)
        .maybeSingle();
      if (wooErr && /woocommerce_product_id|schema|column/i.test(wooErr.message)) {
        hasWooColumn = false;
        console.log('[WooCommerce Sync] woocommerce_product_id column not in DB — run migration 003');
      } else {
        existing = byWoo;
        if (existing) {
          console.log('[WooCommerce Sync] Found existing product by woocommerce_product_id:', product.id);
        }
      }
    } catch {
      hasWooColumn = false;
    }

    if (!existing) {
      const { data: byLink } = await supabase
        .from('inventory')
        .select('id')
        .eq('store_id', store.id)
        .eq('product_link', product.permalink)
        .maybeSingle();
      existing = byLink;
    }

    console.log('[WooCommerce Sync] Setting woocommerce_product_id = ' + product.id + ' (type: ' + typeof product.id + ')');
    const inventoryRecord = hasWooColumn
      ? { ...baseRecord, woocommerce_product_id: product.id }
      : baseRecord;

    console.log('[WooCommerce Sync] inventoryRecord.images:', inventoryRecord.images);

    let data: { id: string } | null = null;
    let error: any = null;

    if (existing) {
      console.log('[WooCommerce Sync] Existing product found, updating id:', existing.id, 'with woocommerce_product_id:', product.id);
      console.log('[WooCommerce Sync] Updating with images array:', inventoryRecord.images);
      const result = await supabase
        .from('inventory')
        .update(inventoryRecord)
        .eq('id', existing.id)
        .select('id')
        .single();
      data = result.data;
      error = result.error;
    } else {
      console.log('[WooCommerce Sync] New product, inserting');
      let result = await supabase
        .from('inventory')
        .insert([inventoryRecord])
        .select('id')
        .single();
      // If insert fails because woocommerce_product_id column is missing, retry without it
      if (result.error && /woocommerce_product_id|column/i.test(result.error.message)) {
        console.log('[WooCommerce Sync] Retrying insert without woocommerce_product_id');
        result = await supabase
          .from('inventory')
          .insert([baseRecord])
          .select('id')
          .single();
      }
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.log('[WooCommerce Sync] DB operation FAILED:', error.message);
      console.log('[WooCommerce Sync] Error details:', error);
      return res.status(500).json({
        error: 'Failed to sync product to inventory',
        details: error.message,
      });
    }

    console.log('[WooCommerce Sync] DB operation SUCCESS, inventory id:', data?.id);
    console.log('[WooCommerce Sync] Product synced with', allImageUrls.length, 'images');

    // Auto-process images in the background
    const allImages = (product.images || []).map((img: WooCommerceImage) => ({
      url: img.src,
      alt: img.alt || product.name,
    }));

    if (data?.id && allImages.length > 0) {
      processProductImages(data.id, allImages).catch(err =>
        console.error(`[WooCommerce] Background image processing failed for ${data.id}:`, err.message),
      );
      console.log(`[WooCommerce] Triggered image processing for product ${data.id} (${allImages.length} images)`);
    } else if (data?.id) {
      // No images: explicitly set tier=3
      await supabase.from('inventory').update({ tier: 3, tryon_image_url: null }).eq('id', data.id);
      console.log(`[WooCommerce] No images for product ${data.id} — set tier=3`);
    }

    res.status(200).json({
      status: 'success',
      message: 'WooCommerce product synced successfully',
      product: {
        name: productName,
        link: product.permalink,
        sizes,
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

export default router;
