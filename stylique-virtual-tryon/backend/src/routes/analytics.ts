import express from 'express';
import type { Router, Request, Response } from 'express';
import { getSupabase } from '../services/supabase.ts';

const router: Router = express.Router();

interface TrackTryonPayload {
  store_id: string;
  product_id?: string;
  user_id?: string;
  tryon_type: string;
  redirect_status?: boolean;
}

// POST /api/track-tryon
router.post('/track-tryon', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const payload: TrackTryonPayload = req.body;

    // Validate required fields
    if (!payload.store_id || !payload.tryon_type) {
      return res.status(400).json({
        error: 'Missing required fields: store_id and tryon_type',
      });
    }

    // Resolve store_id if it's a domain (store_id string)
    let resolvedStoreId = payload.store_id;

    // Check if store_id is a UUID or needs to be resolved
    if (!payload.store_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // Try to find store by domain
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id')
        .eq('store_id', payload.store_id)
        .single();

      if (storeError || !store) {
        return res.status(404).json({
          error: 'Store not found',
          details: `No store found with domain: ${payload.store_id}`,
        });
      }

      resolvedStoreId = store.id;
    }

    // Prepare analytics record
    const analyticsRecord = {
      store_id: resolvedStoreId,
      product_id: payload.product_id || null,
      user_id: payload.user_id || null,
      tryon_type: payload.tryon_type,
      redirect_status: payload.redirect_status || false,
    };

    // Insert into tryon_analytics
    const { data, error } = await supabase
      .from('tryon_analytics')
      .insert([analyticsRecord])
      .select();

    if (error) {
      return res.status(500).json({
        error: 'Failed to record analytics',
        details: error.message,
      });
    }

    // Increment tryons_used counter for the store
    const { error: updateError } = await supabase.rpc('increment_tryons_used', {
      store_uuid: resolvedStoreId,
    });

    if (updateError) {
      console.warn('Warning: Failed to increment tryons_used counter:', updateError);
      // Don't fail the response, as the analytics record was successfully inserted
    }

    res.status(201).json({
      status: 'success',
      message: 'Try-on event tracked successfully',
      analytics: data?.[0] || analyticsRecord,
    });
  } catch (error: any) {
    console.error('Error tracking try-on event:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
});

// POST /api/analytics/conversion
router.post('/analytics/conversion', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { store_id, user_id, product_id, add_to_cart, status } = req.body;

    if (!store_id) {
      return res.status(400).json({ error: 'store_id is required' });
    }

    // Resolve store_id
    let resolvedStoreId = store_id;
    if (!store_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('store_id', store_id)
        .maybeSingle();

      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }
      resolvedStoreId = store.id;
    }

    const record = {
      store_id: resolvedStoreId,
      user_id: user_id || null,
      product_id: product_id || null,
      add_to_cart: add_to_cart === true,
      status: status || 'unknown',
    };

    const { data, error } = await supabase
      .from('conversions')
      .insert([record])
      .select()
      .single();

    if (error) {
      console.error('[Conversion] Insert failed:', error.message);
      return res.status(500).json({ error: 'Failed to record conversion', details: error.message });
    }

    console.log(`[Conversion] store=${resolvedStoreId} product=${product_id} cart=${add_to_cart}`);

    res.status(201).json({
      status: 'success',
      message: 'Conversion recorded',
      conversion: data,
    });
  } catch (error: any) {
    console.error('Error recording conversion:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/analytics/conversions?store_id=...&limit=100
router.get('/analytics/conversions', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const storeId = req.query.store_id as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

    if (!storeId) {
      return res.status(400).json({ error: 'store_id query parameter is required' });
    }

    let resolvedStoreId = storeId;
    if (!storeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('store_id', storeId)
        .maybeSingle();

      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }
      resolvedStoreId = store.id;
    }

    const { data: conversions, error } = await supabase
      .from('conversions')
      .select('*')
      .eq('store_id', resolvedStoreId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch conversions', details: error.message });
    }

    res.status(200).json({
      status: 'success',
      conversions: conversions || [],
      total: conversions?.length ?? 0,
    });
  } catch (error: any) {
    console.error('Error fetching conversions:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/analytics?store_id=...&limit=100&from=...&to=...
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const storeId = req.query.store_id as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    if (!storeId) {
      return res.status(400).json({ error: 'store_id query parameter is required' });
    }

    // Resolve store_id if not UUID
    let resolvedStoreId = storeId;
    if (!storeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id')
        .eq('store_id', storeId)
        .maybeSingle();

      if (storeError || !store) {
        return res.status(404).json({ error: 'Store not found' });
      }
      resolvedStoreId = store.id;
    }

    let query = supabase
      .from('tryon_analytics')
      .select('*')
      .eq('store_id', resolvedStoreId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (from) {
      query = query.gte('created_at', from);
    }
    if (to) {
      query = query.lte('created_at', to);
    }

    const { data: analytics, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
    }

    res.status(200).json({
      status: 'success',
      analytics: analytics || [],
      total: analytics?.length ?? 0,
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
