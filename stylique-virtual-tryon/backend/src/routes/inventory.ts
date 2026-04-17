import express from 'express';
import type { Router, Request, Response } from 'express';
import { getSupabase } from '../services/supabase.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';

const router: Router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveStoreId(storeIdOrDomain: string): Promise<string | null> {
  if (UUID_RE.test(storeIdOrDomain)) {
    return storeIdOrDomain;
  }

  const { data: store } = await getSupabase()
    .from('stores')
    .select('id')
    .eq('store_id', storeIdOrDomain)
    .maybeSingle();

  return store?.id ?? null;
}

async function assertRequestedStoreAllowed(req: Request, res: Response): Promise<string | null> {
  const authStoreId = (req as AuthenticatedRequest).storeAuth?.storeId;
  if (!authStoreId) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  const requestedStoreId = (req.query.store_id as string | undefined) || req.body?.store_id;
  if (!requestedStoreId) {
    return authStoreId;
  }

  const resolvedStoreId = await resolveStoreId(requestedStoreId);
  if (!resolvedStoreId) {
    res.status(404).json({ error: 'Store not found' });
    return null;
  }

  if (resolvedStoreId !== authStoreId) {
    res.status(403).json({ error: 'Forbidden for this store' });
    return null;
  }

  return authStoreId;
}

// GET /api/inventory?store_id=...&product_id=...&limit=50&offset=0
router.get('/inventory', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const authStoreId = await assertRequestedStoreAllowed(req, res);
    if (!authStoreId) return;

    const productId = req.query.product_id as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    let query = supabase
      .from('inventory')
      .select('*')
      .eq('store_id', authStoreId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (productId) {
      query = query.eq('id', productId);
    }

    const { data: inventory, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch inventory', details: error.message });
    }

    // Get total count for the same filter (reuse the resolved store UUID)
    let countQuery = supabase
      .from('inventory')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', authStoreId);
    if (productId) {
      countQuery = countQuery.eq('id', productId);
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
    const authStoreId = await assertRequestedStoreAllowed(req, res);
    if (!authStoreId) return;

    if (!body.product_name) {
      return res.status(400).json({
        error: 'Missing required field: product_name',
      });
    }

    const record = {
      store_id: authStoreId,
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
    const authStoreId = (req as AuthenticatedRequest).storeAuth?.storeId;
    const { store_id: _ignoredStoreId, ...updates } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Missing product ID' });
    }
    if (!authStoreId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Handle soft delete
    if (updates.deleted === true) {
      const { data, error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', productId)
        .eq('store_id', authStoreId)
        .select('id')
        .maybeSingle();

      if (error) {
        return res.status(500).json({ error: 'Failed to delete product', details: error.message });
      }
      if (!data) {
        return res.status(404).json({ error: 'Product not found' });
      }

      return res.status(200).json({ status: 'success', message: 'Product deleted' });
    }

    const { data, error } = await supabase
      .from('inventory')
      .update(updates)
      .eq('id', productId)
      .eq('store_id', authStoreId)
      .select()
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: 'Failed to update product', details: error.message });
    }
    if (!data) {
      return res.status(404).json({ error: 'Product not found' });
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
