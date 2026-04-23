import express from 'express';
import type { Router, Request, Response } from 'express';
import { getSupabase } from '../services/supabase.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { parseStoredThemeInjectionStatus } from '../services/shopifyThemeInjector.ts';

const router: Router = express.Router();

const SHOPIFY_EXTENSION_BLOCK_HANDLE = process.env.SHOPIFY_EXTENSION_BLOCK_HANDLE || 'stylique-tryon';
const SHOPIFY_EXTENSION_EMBED_HANDLE = process.env.SHOPIFY_EXTENSION_EMBED_HANDLE || 'stylique-embed';
const SHOPIFY_EXTENSION_VERSION = process.env.SHOPIFY_EXTENSION_VERSION || '0.1.0';
const SHOPIFY_EXTENSION_APP_API_KEY =
  process.env.SHOPIFY_EXTENSION_APP_API_KEY || process.env.SHOPIFY_API_KEY || null;

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
    const authStore = (req as AuthenticatedRequest).storeAuth;

    if (!storeId || typeof storeId !== 'string') {
      return res.status(400).json({
        error: 'Missing store ID parameter',
      });
    }
    if (!authStore?.storeId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (storeId !== authStore.storeId && storeId !== authStore.store_id) {
      return res.status(403).json({ error: 'Forbidden for this store' });
    }

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select(
        'id, store_name, store_id, email, phone, subscription_name, subscription_start_at, subscription_end_at, tryons_quota, tryons_used, shopify_theme_injection_done, shopify_theme_injection_status, shopify_shop_domain, shopify_extension_last_seen_at, shopify_extension_install_method, shopify_extension_version, shopify_extension_setup_status, woocommerce_site_url, woocommerce_connected_at, woocommerce_last_sync_at, woocommerce_last_sync_status'
      )
      .eq('id', authStore.storeId)
      .maybeSingle();

    if (storeError || !store) {
      return res.status(404).json({
        error: 'Store not found',
        details: `No store found with id or domain: ${storeId}`,
      });
    }

    // Calculate remaining quota
    const tryonsRemaining = Math.max(0, store.tryons_quota - store.tryons_used);
    const parsedThemeInjection = parseStoredThemeInjectionStatus(
      store.shopify_theme_injection_status ?? null,
      store.shopify_theme_injection_done ?? false,
    );

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
      themeInjection: {
        ...(parsedThemeInjection ?? {}),
        done: store.shopify_theme_injection_done ?? parsedThemeInjection?.done ?? false,
        status: store.shopify_theme_injection_status ?? null,
        shopDomain: store.shopify_shop_domain ?? parsedThemeInjection?.shopDomain ?? null,
      },
      shopifyExtension: {
        recommended: true,
        appApiKey: SHOPIFY_EXTENSION_APP_API_KEY,
        blockHandle: SHOPIFY_EXTENSION_BLOCK_HANDLE,
        embedHandle: SHOPIFY_EXTENSION_EMBED_HANDLE,
        version: SHOPIFY_EXTENSION_VERSION,
        lastSeenAt: store.shopify_extension_last_seen_at ?? null,
        installMethod: store.shopify_extension_install_method ?? null,
        setupStatus: store.shopify_extension_setup_status ?? null,
        links: store.shopify_shop_domain && SHOPIFY_EXTENSION_APP_API_KEY
          ? {
              addAppBlockMain: `https://${store.shopify_shop_domain}/admin/themes/current/editor?template=product&addAppBlockId=${SHOPIFY_EXTENSION_APP_API_KEY}/${SHOPIFY_EXTENSION_BLOCK_HANDLE}&target=mainSection`,
              addAppBlockApps: `https://${store.shopify_shop_domain}/admin/themes/current/editor?template=product&addAppBlockId=${SHOPIFY_EXTENSION_APP_API_KEY}/${SHOPIFY_EXTENSION_BLOCK_HANDLE}&target=newAppsSection`,
              activateEmbed: `https://${store.shopify_shop_domain}/admin/themes/current/editor?context=apps&template=product&activateAppId=${SHOPIFY_EXTENSION_APP_API_KEY}/${SHOPIFY_EXTENSION_EMBED_HANDLE}`,
            }
          : null,
      },
      woocommerceIntegration: {
        connected: Boolean(store.woocommerce_site_url || store.woocommerce_connected_at),
        siteUrl: store.woocommerce_site_url ?? null,
        connectedAt: store.woocommerce_connected_at ?? null,
        lastSyncAt: store.woocommerce_last_sync_at ?? null,
        lastSyncStatus: store.woocommerce_last_sync_status ?? null,
      },
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
