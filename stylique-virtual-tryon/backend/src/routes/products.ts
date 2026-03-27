import express from 'express';
import type { Router, Request, Response } from 'express';
import { getSupabase } from '../services/supabase.ts';

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

// POST /api/sync/shopify
router.post('/sync/shopify', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const payload: ShopifyWebhookPayload = req.body;

    // Extract shop domain
    const shopDomain = payload.shop?.domain;
    if (!shopDomain) {
      return res.status(400).json({
        error: 'Missing shop domain in webhook payload',
      });
    }

    // Find store by domain
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('store_id', shopDomain)
      .single();

    if (storeError || !store) {
      return res.status(404).json({
        error: 'Store not found',
        details: `No store found with domain: ${shopDomain}`,
      });
    }

    const product = payload.product;

    // Extract product data
    const productName = product.title;
    const description = product.body_html || '';
    const price = product.variants?.[0]?.price || '0';
    const imageUrl = product.images?.[0]?.src || '';
    const sizes = product.variants
      ?.map((v) => v.option1)
      .filter((size): size is string => size !== null && size !== undefined) || [];
    const productLink = `https://${shopDomain}/products/${product.handle}`;

    // Prepare inventory record
    const inventoryRecord = {
      store_id: store.id,
      product_name: productName,
      description,
      price: parseFloat(price),
      image_url: imageUrl,
      sizes: sizes.length > 0 ? sizes : [],
      product_link: productLink,
      shopify_product_id: product.id.toString(),
    };

    // Upsert product into inventory
    const { data, error } = await supabase
      .from('inventory')
      .upsert([inventoryRecord], {
        onConflict: 'product_link',
      });

    if (error) {
      return res.status(500).json({
        error: 'Failed to sync product to inventory',
        details: error.message,
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Product synced successfully',
      product: {
        name: productName,
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

export default router;
