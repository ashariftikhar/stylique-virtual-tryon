import express from 'express';
import type { Router, Request, Response } from 'express';
import { getSupabase } from '../services/supabase.ts';

const router: Router = express.Router();

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

    // Extract store domain
    const storeDomain = payload.store_domain;
    if (!storeDomain) {
      return res.status(400).json({
        error: 'Missing store_domain in webhook payload',
      });
    }

    // Find store by domain
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('store_id', storeDomain)
      .single();

    if (storeError || !store) {
      return res.status(404).json({
        error: 'Store not found',
        details: `No store found with domain: ${storeDomain}`,
      });
    }

    const product = payload.product;

    // Extract product data
    const productName = product.name;
    const description = product.description || '';
    const price = product.price || '0';
    const imageUrl = product.images?.[0]?.src || '';
    
    // Extract sizes from variant attributes
    const sizes: string[] = [];
    product.variants?.forEach((variant) => {
      variant.attributes?.forEach((attr) => {
        if (attr.name.toLowerCase() === 'size' && !sizes.includes(attr.option)) {
          sizes.push(attr.option);
        }
      });
    });

    // Prepare inventory record
    const inventoryRecord = {
      store_id: store.id,
      product_name: productName,
      description,
      price: parseFloat(price),
      image_url: imageUrl,
      sizes: sizes.length > 0 ? sizes : [],
      product_link: product.permalink,
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
