import express from 'express';
import type { Router, Request, Response } from 'express';
import { getSupabase } from '../services/supabase.ts';

const router: Router = express.Router();

// GET /api/inventory?store_id=...&product_id=...&limit=50&offset=0
router.get('/inventory', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const storeId = req.query.store_id as string | undefined;
    const productId = req.query.product_id as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    let query = supabase
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (storeId) {
      // Allow querying by UUID or by store_id string
      if (storeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        query = query.eq('store_id', storeId);
      } else {
        // Resolve store_id string to UUID first
        const { data: store } = await supabase
          .from('stores')
          .select('id')
          .eq('store_id', storeId)
          .maybeSingle();

        if (!store) {
          return res.status(404).json({ error: 'Store not found' });
        }
        query = query.eq('store_id', store.id);
      }
    }

    if (productId) {
      query = query.eq('id', productId);
    }

    const { data: inventory, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch inventory', details: error.message });
    }

    // Get total count for the same filter (reuse the resolved store UUID)
    let countQuery = supabase.from('inventory').select('id', { count: 'exact', head: true });
    if (storeId) {
      const isUUID = storeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      if (isUUID) {
        countQuery = countQuery.eq('store_id', storeId);
      } else {
        const { data: storeRow } = await supabase
          .from('stores')
          .select('id')
          .eq('store_id', storeId)
          .maybeSingle();
        if (storeRow) {
          countQuery = countQuery.eq('store_id', storeRow.id);
        }
      }
    }
    const { count } = await countQuery;

    res.status(200).json({
      status: 'success',
      inventory: inventory || [],
      total: count ?? inventory?.length ?? 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// POST /api/inventory
router.post('/inventory', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const body = req.body;

    if (!body.store_id || !body.product_name) {
      return res.status(400).json({
        error: 'Missing required fields: store_id, product_name',
      });
    }

    // Resolve store_id if not UUID
    let resolvedStoreId = body.store_id;
    if (!body.store_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('store_id', body.store_id)
        .maybeSingle();

      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }
      resolvedStoreId = store.id;
    }

    const record = {
      store_id: resolvedStoreId,
      product_name: body.product_name,
      description: body.description || null,
      price: body.price ? parseFloat(body.price) : null,
      image_url: body.image_url || null,
      sizes: body.sizes || [],
      measurements: body.measurements || {}, // Default to empty object
      product_link: body.product_link || null,
      category: body.category || null,
      gender: body.gender || 'UNSPECIFIED', // Default to UNSPECIFIED
      fabric_type: body.fabric_type || 'MEDIUM_STRETCH', // Default to MEDIUM_STRETCH
      season: body.season || 'ALL_SEASON', // Default to ALL_SEASON
      activity: body.activity || 'CASUAL', // Default to CASUAL
      occasion: body.occasion || 'WEEKEND_CASUAL', // Default to WEEKEND_CASUAL
      colour: body.colour || 'UNSPECIFIED', // Default for colour
    };

    const { data, error } = await supabase
      .from('inventory')
      .insert([record])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create product', details: error.message });
    }

    res.status(201).json({
      status: 'success',
      message: 'Product created',
      product: data,
    });
  } catch (error: any) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// PATCH /api/inventory/:id
router.patch('/inventory/:id', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const productId = req.params.id;
    const updates = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Missing product ID' });
    }

    // Handle soft delete
    if (updates.deleted === true) {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', productId);

      if (error) {
        return res.status(500).json({ error: 'Failed to delete product', details: error.message });
      }

      return res.status(200).json({ status: 'success', message: 'Product deleted' });
    }

    const { data, error } = await supabase
      .from('inventory')
      .update(updates)
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update product', details: error.message });
    }

    res.status(200).json({
      status: 'success',
      message: 'Product updated',
      product: data,
    });
  } catch (error: any) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
