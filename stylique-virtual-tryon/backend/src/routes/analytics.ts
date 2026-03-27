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

export default router;
