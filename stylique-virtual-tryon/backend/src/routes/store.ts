import express from 'express';
import type { Router, Request, Response } from 'express';
import { getSupabase } from '../services/supabase.ts';

const router: Router = express.Router();

interface StoreConfig {
  id: string;
  store_name: string;
  store_id: string;
  email?: string;
  phone?: string;
  subscription_plan?: string;
  subscription_start_at?: string;
  subscription_end_at?: string;
  tryons_quota: number;
  tryons_used: number;
  tryons_remaining: number;
}

// GET /api/store/:id/config
router.get('/store/:id/config', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const storeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!storeId || typeof storeId !== 'string') {
      return res.status(400).json({
        error: 'Missing store ID parameter',
      });
    }

    // Resolve store: try by store_id slug first, then by UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId);
    const lookupCol = isUUID ? 'id' : 'store_id';

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select(
        'id, store_name, store_id, email, phone, subscription_name, subscription_start_at, subscription_end_at, tryons_quota, tryons_used'
      )
      .eq(lookupCol, storeId)
      .maybeSingle();

    if (storeError || !store) {
      return res.status(404).json({
        error: 'Store not found',
        details: `No store found with id or domain: ${storeId}`,
      });
    }

    // Calculate remaining quota
    const tryonsRemaining = Math.max(0, store.tryons_quota - store.tryons_used);

    // Build response config
    const config: StoreConfig = {
      id: store.id,
      store_name: store.store_name,
      store_id: store.store_id,
      email: store.email,
      phone: store.phone,
      subscription_plan: store.subscription_name,
      subscription_start_at: store.subscription_start_at,
      subscription_end_at: store.subscription_end_at,
      tryons_quota: store.tryons_quota,
      tryons_used: store.tryons_used,
      tryons_remaining: tryonsRemaining,
    };

    // Check if subscription is active
    const now = new Date();
    const subscriptionActive =
      store.subscription_end_at && new Date(store.subscription_end_at) > now;

    res.status(200).json({
      status: 'success',
      config,
      subscriptionActive,
    });
  } catch (error: any) {
    console.error('Error fetching store config:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
});

export default router;
