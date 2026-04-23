'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  ExternalLink,
  PlugZap,
  RefreshCw,
  Settings2,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { AlertBanner, Badge, Button, Card, MetricCard, PageHeader, Skeleton } from '@/components/ui';
import { apiClient } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { StoreConfig, StoreConfigResponse, ThemeInjectionStatus, WooCommerceIntegration } from '@/types/api';

const fade = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

function safeDateTime(value?: string | null) {
  if (!value) return 'Not recorded';
  try {
    return formatDateTime(value);
  } catch {
    return value;
  }
}

export default function SettingsPage() {
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const [woocommerce, setWooCommerce] = useState<WooCommerceIntegration | null>(null);
  const [shopifyExtension, setShopifyExtension] = useState<StoreConfigResponse['shopifyExtension'] | null>(null);
  const [themeInjection, setThemeInjection] = useState<ThemeInjectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const storeId = typeof window !== 'undefined' ? localStorage.getItem('store_id') : null;
      if (!storeId) {
        setError('Store session is missing. Please sign in again.');
        return;
      }

      const data = await apiClient.getStoreConfig(storeId);
      setStoreConfig(data.config);
      setWooCommerce(data.woocommerceIntegration || null);
      setShopifyExtension(data.shopifyExtension || null);
      setThemeInjection(data.themeInjection || null);
    } catch {
      setError('Unable to load integration settings. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const wooConnected = Boolean(woocommerce?.connected);
  const storeUrl = woocommerce?.siteUrl || (storeConfig?.store_id ? `https://${storeConfig.store_id}` : '');
  const extensionSeen = Boolean(shopifyExtension?.lastSeenAt);
  const isShopifyStore = Boolean(storeConfig?.store_id?.includes('.myshopify.com'));

  return (
    <motion.div
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
    >
      <motion.div variants={fade}>
        <PageHeader
          eyebrow="Settings"
          title="Integrations"
          description="Review connected commerce platforms and confirm the latest widget and sync status for Shopify or WooCommerce."
          action={
            <Button variant="secondary" onClick={loadSettings}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          }
        />
      </motion.div>

      {error && (
        <motion.div variants={fade}>
          <AlertBanner tone="danger" title="Settings unavailable">
            {error}
          </AlertBanner>
        </motion.div>
      )}

      <motion.div variants={fade} className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Store"
          value={storeConfig?.store_name || 'Unknown'}
          detail={storeConfig?.store_id || 'Store ID unavailable'}
          icon={Store}
          accent="white"
        />
        <MetricCard
          label="Shopify Widget"
          value={!isShopifyStore ? 'Not applicable' : extensionSeen ? 'Detected' : 'Setup needed'}
          detail={
            !isShopifyStore
              ? 'This panel is not using Shopify'
              : extensionSeen
                ? `Seen ${safeDateTime(shopifyExtension?.lastSeenAt)}`
                : 'Add the app block to a product template'
          }
          icon={PlugZap}
          accent={!isShopifyStore ? 'white' : extensionSeen ? 'emerald' : 'amber'}
        />
        <MetricCard
          label="WooCommerce"
          value={wooConnected ? 'Connected' : 'Not connected'}
          detail={wooConnected ? 'Plugin connection is active' : 'Connect from WordPress admin'}
          icon={ShoppingBag}
          accent={wooConnected ? 'emerald' : 'amber'}
        />
        <MetricCard
          label="Last Sync"
          value={woocommerce?.lastSyncAt ? safeDateTime(woocommerce.lastSyncAt) : 'Not synced'}
          detail={woocommerce?.lastSyncStatus || 'No WooCommerce sync status yet'}
          icon={CheckCircle2}
          accent={woocommerce?.lastSyncAt ? 'teal' : 'amber'}
        />
      </motion.div>

      {isShopifyStore && shopifyExtension && (
        <motion.div variants={fade}>
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-5 border-b border-[#161616]/10 pb-5 md:flex-row md:items-start md:justify-between">
              <div>
                <Badge variant={extensionSeen ? 'success' : 'warning'}>
                  {extensionSeen ? 'Theme App Extension Active' : 'Theme App Extension Setup Needed'}
                </Badge>
                <h2 className="mt-4 text-2xl font-black text-[#161616]">Shopify storefront widget</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66736f]">
                  The Shopify app block is the primary storefront install. Add the app block first, then only enable the embed if support asks for the optional helper mode.
                </p>
              </div>
              {shopifyExtension.links?.addAppBlockMain && (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => window.open(shopifyExtension.links?.addAppBlockMain, '_blank', 'noopener,noreferrer')}>
                    <PlugZap className="h-4 w-4" />
                    Add App Block
                  </Button>
                  {shopifyExtension.links?.activateEmbed && (
                    <Button
                      variant="secondary"
                      onClick={() => window.open(shopifyExtension.links?.activateEmbed, '_blank', 'noopener,noreferrer')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Enable Embed
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-[#161616]/10 bg-[#f2f6f4] p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#161616]">
                  <PlugZap className="h-4 w-4 text-[#08786e]" />
                  Extension Status
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-[#66736f]">Block</dt>
                    <dd className="text-right font-semibold text-[#33413c]">{shopifyExtension.blockHandle}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-[#66736f]">Embed</dt>
                    <dd className="text-right font-semibold text-[#33413c]">{shopifyExtension.embedHandle}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-[#66736f]">Last seen</dt>
                    <dd className="text-right font-semibold text-[#33413c]">{safeDateTime(shopifyExtension.lastSeenAt)}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-[#66736f]">Install method</dt>
                    <dd className="text-right font-semibold text-[#33413c]">{shopifyExtension.installMethod || 'Not detected yet'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border border-[#161616]/10 bg-[#f2f6f4] p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#161616]">
                  <Settings2 className="h-4 w-4 text-amber-700" />
                  Setup Guidance
                </div>
                <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[#33413c]">
                  <li>Click <strong>Add App Block</strong> and save the product template.</li>
                  <li>Open a live product page so the widget can load and send heartbeat.</li>
                  <li>Use <strong>Enable Embed</strong> only if support asks for helper mode.</li>
                </ol>
                {shopifyExtension.links?.addAppBlockApps && (
                  <button
                    className="mt-4 text-xs font-semibold text-[#08786e] underline-offset-4 hover:underline"
                    onClick={() => window.open(shopifyExtension.links?.addAppBlockApps, '_blank', 'noopener,noreferrer')}
                  >
                    App block did not land in the main section? Try the Apps section fallback.
                  </button>
                )}
                {shopifyExtension.setupStatus && (
                  <p className="mt-4 text-xs text-[#66736f]">{shopifyExtension.setupStatus}</p>
                )}
              </div>
            </div>

            {themeInjection && !themeInjection.done && (themeInjection.status || themeInjection.message) && (
              <AlertBanner tone="warning" title="Legacy theme-file injection fallback" className="mt-6">
                {themeInjection.message || themeInjection.status}
              </AlertBanner>
            )}
          </Card>
        </motion.div>
      )}

      <motion.div variants={fade}>
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-5 border-b border-[#161616]/10 pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge variant={wooConnected ? 'success' : 'warning'}>
                {wooConnected ? 'WooCommerce Connected' : 'WooCommerce Setup Needed'}
              </Badge>
              <h2 className="mt-4 text-2xl font-black text-[#161616]">WooCommerce plugin status</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66736f]">
                The WordPress plugin connects the store, generates a secure sync secret, and pushes product updates to Stylique.
              </p>
            </div>
            {storeUrl && (
              <Button
                variant="secondary"
                onClick={() => window.open(storeUrl, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="h-4 w-4" />
                Open Store
              </Button>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[#161616]/10 bg-[#f2f6f4] p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#161616]">
                <PlugZap className="h-4 w-4 text-[#08786e]" />
                Connection
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-[#66736f]">Site URL</dt>
                  <dd className="text-right font-semibold text-[#33413c]">{woocommerce?.siteUrl || 'Not connected'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-[#66736f]">Connected at</dt>
                  <dd className="text-right font-semibold text-[#33413c]">{safeDateTime(woocommerce?.connectedAt)}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border border-[#161616]/10 bg-[#f2f6f4] p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#161616]">
                <Settings2 className="h-4 w-4 text-amber-700" />
                Sync Activity
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-[#66736f]">Last sync</dt>
                  <dd className="text-right font-semibold text-[#33413c]">{safeDateTime(woocommerce?.lastSyncAt)}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-[#66736f]">Status</dt>
                  <dd className="max-w-sm text-right font-semibold text-[#33413c]">
                    {woocommerce?.lastSyncStatus || 'No sync has been recorded yet'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {!wooConnected && (
            <AlertBanner tone="info" title="Connect from WordPress" className="mt-6">
              Install and activate the Stylique WooCommerce plugin, then go to WordPress Admin, Settings, Stylique Try-On and click Connect Stylique.
            </AlertBanner>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
