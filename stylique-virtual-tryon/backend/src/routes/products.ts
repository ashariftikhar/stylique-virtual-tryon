import express from 'express';
import type { Router, Request, Response } from 'express';
import { getSupabase } from '../services/supabase.ts';
import { processProductImages } from './images.ts';
import { resolveStoreIdByShopDomain, syncShopifyProductToInventory } from '../services/shopifySync.ts';

const router: Router = express.Router();

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  images: Array<{ src: string }>;
  variants: Array<{ price: string; option1: string | null }>;
}

interface ShopifyWebhookPayload {
  shop: {
    id: number;
    name: string;
    domain: string;
  };
  product: ShopifyProduct;
}

// POST /api/sync/shopify — legacy/custom payload { shop: { domain }, product } (same as shared sync)
router.post('/sync/shopify', async (req: Request, res: Response) => {
  try {
    const raw = req.body as unknown;
    let shopDomain: string | undefined;
    let product: ShopifyProduct | undefined;

    if (raw && typeof raw === 'object' && 'product' in raw && 'shop' in raw) {
      const wrapped = raw as ShopifyWebhookPayload;
      if (wrapped.shop?.domain && wrapped.product?.handle) {
        shopDomain = wrapped.shop.domain;
        product = wrapped.product;
      }
    }
    if (!product) {
      const headerShop = req.headers['x-shopify-shop-domain'];
      const flat =
        raw && typeof raw === 'object' && 'id' in raw && 'handle' in raw
          ? (raw as ShopifyProduct)
          : undefined;
      if (typeof headerShop === 'string' && flat?.handle) {
        shopDomain = headerShop;
        product = flat;
      }
    }
    if (!shopDomain || !product || !product.id || !product.handle) {
      return res.status(400).json({
        error: 'Expected body { shop: { domain }, product } or Shopify product JSON + X-Shopify-Shop-Domain header',
      });
    }

    const storeUuid = await resolveStoreIdByShopDomain(shopDomain);
    if (!storeUuid) {
      return res.status(404).json({
        error: 'Store not found',
        details: `No store linked to Shopify shop: ${shopDomain}`,
      });
    }

    const row = await syncShopifyProductToInventory(storeUuid, shopDomain, product);
    if (!row) {
      return res.status(500).json({ error: 'Failed to sync product to inventory' });
    }

    const sizes =
      product.variants
        ?.map((v) => v.option1)
        .filter((size): size is string => size !== null && size !== undefined) || [];
    const productLink = `https://${shopDomain}/products/${product.handle}`;

    res.status(200).json({
      status: 'success',
      message: 'Product synced successfully',
      product: {
        name: product.title,
        link: productLink,
        sizes,
      },
    });
  } catch (error: any) {
    console.error('Error syncing Shopify product:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
});

/**
 * POST /api/sync/products
 * Bulk sync: accepts an array of products in Shopify or WooCommerce format.
 */
router.post('/sync/products', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { store_domain, products, format } = req.body;

    if (!store_domain || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: store_domain, products (array)',
      });
    }

    // Resolve store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('store_id', store_domain)
      .single();

    if (storeError || !store) {
      return res.status(404).json({ error: 'Store not found', details: `No store with domain: ${store_domain}` });
    }

    const results: Array<{ name: string; status: string; error?: string }> = [];

    for (const product of products) {
      try {
        const isShopify = format === 'shopify' || product.handle != null;

        let record: Record<string, any>;

        if (isShopify) {
          const price = product.variants?.[0]?.price || '0';
          const sizes = product.variants
            ?.map((v: any) => v.option1)
            .filter((s: any) => s != null) || [];
          record = {
            store_id: store.id,
            product_name: product.title || product.name,
            description: product.body_html || product.description || '',
            price: parseFloat(price),
            image_url: product.images?.[0]?.src || product.image?.src || '',
            sizes,
            product_link: product.handle
              ? `https://${store_domain}/products/${product.handle}`
              : product.permalink || '',
            ...(product.id != null ? { shopify_product_id: String(product.id) } : {}),
          };
        } else {
          const sizes: string[] = [];
          product.variants?.forEach((v: any) => {
            v.attributes?.forEach((attr: any) => {
              if (attr.name?.toLowerCase() === 'size' && !sizes.includes(attr.option)) {
                sizes.push(attr.option);
              }
            });
          });
          record = {
            store_id: store.id,
            product_name: product.name || product.title,
            description: product.description || '',
            price: parseFloat(product.price || '0'),
            image_url: product.images?.[0]?.src || '',
            sizes,
            product_link: product.permalink || '',
          };
        }

        let existingBulk: { id: string } | null = null;
        if (!isShopify && product.id != null) {
          try {
            const { data: byWoo, error: wErr } = await supabase
              .from('inventory')
              .select('id')
              .eq('store_id', store.id)
              .eq('woocommerce_product_id', String(product.id))
              .maybeSingle();
            if (!wErr) existingBulk = byWoo;
          } catch { /* column may not exist */ }
        }
        if (!existingBulk) {
          const { data: byLink } = await supabase
            .from('inventory')
            .select('id')
            .eq('store_id', store.id)
            .eq('product_link', record.product_link)
            .maybeSingle();
          existingBulk = byLink;
        }

        // Try adding woocommerce_product_id if not Shopify
        if (!isShopify && product.id != null) {
          record.woocommerce_product_id = String(product.id);
        }

        let upsertData: { id: string } | null = null;
        let upsertErr: any = null;

        if (existingBulk) {
          const r = await supabase.from('inventory').update(record).eq('id', existingBulk.id).select('id').single();
          upsertData = r.data;
          upsertErr = r.error;
        } else {
          let r = await supabase.from('inventory').insert([record]).select('id').single();
          if (r.error && /woocommerce_product_id|column/i.test(r.error.message)) {
            delete record.woocommerce_product_id;
            r = await supabase.from('inventory').insert([record]).select('id').single();
          }
          upsertData = r.data;
          upsertErr = r.error;
        }

        if (!upsertErr && upsertData?.id) {
          const allImages = (product.images || []).map((img: any) => ({
            url: img.src || img.url,
            alt: img.alt || record.product_name,
          }));
          if (allImages.length > 0) {
            processProductImages(upsertData.id, allImages).catch(err =>
              console.error(`[BulkSync] Image processing failed for ${upsertData.id}:`, err.message),
            );
          } else {
            await supabase.from('inventory').update({ tier: 3, tryon_image_url: null }).eq('id', upsertData.id);
          }
        }

        results.push({
          name: record.product_name,
          status: upsertErr ? 'failed' : 'synced',
          error: upsertErr?.message,
        });
      } catch (itemErr: any) {
        results.push({
          name: product.title || product.name || 'unknown',
          status: 'failed',
          error: itemErr.message,
        });
      }
    }

    const synced = results.filter(r => r.status === 'synced').length;
    const failed = results.filter(r => r.status === 'failed').length;
    console.log(`[BulkSync] store=${store_domain} synced=${synced} failed=${failed}`);

    res.status(200).json({
      status: 'success',
      message: `Processed ${results.length} products: ${synced} synced, ${failed} failed`,
      results,
    });
  } catch (error: any) {
    console.error('Error in bulk sync:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
