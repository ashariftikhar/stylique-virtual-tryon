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
import type { StoreConfig, WooCommerceIntegration } from '@/types/api';

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
          description="Review connected commerce platforms and confirm the latest WooCommerce sync activity."
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

      <motion.div variants={fade} className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Store"
          value={storeConfig?.store_name || 'Unknown'}
          detail={storeConfig?.store_id || 'Store ID unavailable'}
          icon={Store}
          accent="white"
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
