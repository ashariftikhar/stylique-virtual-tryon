'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Layers,
  Package,
  PlugZap,
  RefreshCw,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { AlertBanner, Badge, Button, Card, EmptyState, MetricCard, PageHeader, Skeleton } from '@/components/ui';
import { apiClient } from '@/lib/api';
import { InventoryItem, StoreConfig, StoreConfigResponse, ThemeInjectionStatus } from '@/types/api';

const fade = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

function formatNumber(value: number | null | undefined) {
  if (value == null) return '0';
  return new Intl.NumberFormat('en-US').format(value);
}

export default function StorePanelHome() {
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [tryonCount, setTryonCount] = useState(0);
  const [shopifyExtension, setShopifyExtension] = useState<StoreConfigResponse['shopifyExtension'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [themeInjection, setThemeInjection] = useState<ThemeInjectionStatus | null>(null);
  const [themeRetrying, setThemeRetrying] = useState(false);
  const [themeCopyStatus, setThemeCopyStatus] = useState('');
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const storeId = typeof window !== 'undefined' ? localStorage.getItem('store_id') : null;
      if (!storeId) {
        router.push('/login');
        return;
      }

      const [configRes, inventoryRes, analyticsRes] = await Promise.allSettled([
        apiClient.getStoreConfig(storeId),
        apiClient.getInventory(storeId, 200),
        apiClient.getAnalytics(storeId, 1),
      ]);

      if (configRes.status === 'fulfilled') {
        const data: any = configRes.value;
        setStoreConfig(data.config);
        if (data.themeInjection) setThemeInjection(data.themeInjection);
        if (data.shopifyExtension) setShopifyExtension(data.shopifyExtension);
      }

      if (inventoryRes.status === 'fulfilled') {
        const data: any = inventoryRes.value;
        setInventory(data.inventory || data.products || []);
      } else {
        setInventory([]);
      }

      if (analyticsRes.status === 'fulfilled') {
        const data: any = analyticsRes.value;
        setTryonCount(data.total ?? data.analytics?.length ?? 0);
      } else {
        setTryonCount(0);
      }
    } catch {
      setError('Failed to load the store dashboard. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const retryThemeInjection = useCallback(async () => {
    try {
      setThemeRetrying(true);
      setThemeCopyStatus('');
      const result = await apiClient.retryShopifyThemeInjection();
      if (result.status) setThemeInjection(result.status);
      setThemeCopyStatus(result.success ? 'Automatic setup completed.' : result.message || 'Retry finished with setup still needed.');
      await loadData();
    } catch (err: any) {
      setThemeCopyStatus(err?.message || 'Retry failed. Please use the manual setup steps below.');
    } finally {
      setThemeRetrying(false);
    }
  }, [loadData]);

  const copyThemeAsset = useCallback(async (asset: 'section' | 'css') => {
    try {
      const assets = await apiClient.getShopifyThemeInstallAssets();
      const value = asset === 'section' ? assets.sectionLiquid : assets.css;
      await navigator.clipboard.writeText(value);
      setThemeCopyStatus(asset === 'section' ? 'Copied Liquid section code.' : 'Copied CSS asset code.');
    } catch (err: any) {
      setThemeCopyStatus(err?.message || 'Could not copy asset code. Please retry.');
    }
  }, []);

  const insights = useMemo(() => {
    const tierCounts = { 1: 0, 2: 0, 3: 0, none: 0 };
    let tryonReadyCount = 0;

    inventory.forEach((item) => {
      if (item.tier === 1) tierCounts[1] += 1;
      else if (item.tier === 2) tierCounts[2] += 1;
      else if (item.tier === 3) tierCounts[3] += 1;
      else tierCounts.none += 1;

      if (item.tryon_image_url && item.tier && item.tier <= 2) {
        tryonReadyCount += 1;
      }
    });

    const readiness = inventory.length ? Math.round((tryonReadyCount / inventory.length) * 100) : 0;
    const quotaRemaining = storeConfig
      ? Math.max(0, (storeConfig.tryons_quota || 0) - (storeConfig.tryons_used || 0))
      : null;
    const quotaUsage = storeConfig?.tryons_quota
      ? Math.min(100, Math.round(((storeConfig.tryons_used || 0) / storeConfig.tryons_quota) * 100))
      : 0;
    const attention = inventory
      .filter((item) => !item.tier || item.tier === 3 || item.sync_status === 'failed' || !item.tryon_image_url)
      .slice(0, 5);

    return { tierCounts, tryonReadyCount, readiness, quotaRemaining, quotaUsage, attention };
  }, [inventory, storeConfig]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-36" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const storeName = storeConfig?.store_name?.split(' ')[0] || 'Store';
  const themeReason =
    themeInjection?.message ||
    (themeInjection?.code === 'blocked_by_shopify_theme_write'
      ? 'Shopify blocked automatic theme-file writes, but your store connection and product sync are working.'
      : 'Automatic setup did not complete, but your store connection and product sync are working.');
  const themeDetails = themeInjection?.details || themeInjection?.status || '';
  const themeCustomizerUrl =
    themeInjection?.links?.customizer ||
    (themeInjection?.shopDomain ? `https://${themeInjection.shopDomain}/admin/themes/current/editor?context=apps` : '');
  const themeCodeUrl =
    themeInjection?.links?.codeEditor ||
    (themeInjection?.shopDomain ? `https://${themeInjection.shopDomain}/admin/themes` : '');
  const extensionSeen = Boolean(shopifyExtension?.lastSeenAt);
  const extensionSeenLabel = shopifyExtension?.lastSeenAt
    ? new Date(shopifyExtension.lastSeenAt).toLocaleString()
    : 'Not detected yet';

  return (
    <motion.div
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
    >
      <motion.div variants={fade}>
        <PageHeader
          eyebrow="Command Center"
          title={`Welcome back, ${storeName}`}
          description="A clean read on product quality, widget status, try-on volume, and the next actions that keep your storefront feeling premium."
          action={
            <>
              <Button variant="secondary" onClick={loadData}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={() => router.push('/upload')}>
                <Upload className="h-4 w-4" />
                Upload Product
              </Button>
            </>
          }
        />
      </motion.div>

      {error && (
        <motion.div variants={fade}>
          <AlertBanner tone="danger" title="Dashboard unavailable">
            {error}
          </AlertBanner>
        </motion.div>
      )}

      {shopifyExtension && (
        <motion.div variants={fade}>
          <AlertBanner
            tone={extensionSeen ? 'success' : 'info'}
            title={extensionSeen ? 'Theme App Extension detected' : 'Recommended: Theme App Extension'}
            action={
              shopifyExtension.links ? (
                <>
                  {shopifyExtension.links.addAppBlockMain && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => window.open(shopifyExtension.links?.addAppBlockMain, '_blank')}
                    >
                      <PlugZap className="h-4 w-4" />
                      Add App Block
                    </Button>
                  )}
                  {shopifyExtension.links.activateEmbed && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open(shopifyExtension.links?.activateEmbed, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Enable Embed
                    </Button>
                  )}
                </>
              ) : undefined
            }
          >
            <p>
              Use the Shopify Theme App Extension as the primary storefront install. It avoids protected theme-file writes and lets merchants add Stylique from the Shopify theme editor.
            </p>
            <div className="mt-3 grid gap-2 text-xs text-sky-50/80 sm:grid-cols-3">
              <span>Block: <strong className="text-white">{shopifyExtension.blockHandle}</strong></span>
              <span>Embed: <strong className="text-white">{shopifyExtension.embedHandle}</strong></span>
              <span>Last seen: <strong className="text-white">{extensionSeenLabel}</strong></span>
            </div>
            {shopifyExtension.installMethod && (
              <p className="mt-2 text-xs text-sky-50/75">
                Install method: <strong>{shopifyExtension.installMethod}</strong>
                {shopifyExtension.setupStatus ? ` | ${shopifyExtension.setupStatus}` : ''}
              </p>
            )}
            {shopifyExtension.links?.addAppBlockApps && (
              <button
                className="mt-2 text-xs font-semibold text-sky-100/80 underline-offset-4 hover:text-white hover:underline"
                onClick={() => window.open(shopifyExtension.links?.addAppBlockApps, '_blank')}
              >
                App block did not land in the main section? Try the Apps section fallback.
              </button>
            )}
          </AlertBanner>
        </motion.div>
      )}

      {themeInjection && !themeInjection.done && (themeInjection.status || themeInjection.message) && (
        <motion.div variants={fade}>
          <AlertBanner
            tone="warning"
            title="Store connected. Widget setup needs attention."
            action={
              themeInjection.shopDomain ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(themeCodeUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Code Editor
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(themeCustomizerUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Theme Customizer
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={themeRetrying}
                    onClick={retryThemeInjection}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry Setup
                  </Button>
                </>
              ) : undefined
            }
          >
            <p>{themeReason}</p>
            <p className="mt-2 text-sm text-amber-50/80">
              Products and webhooks can continue syncing. To finish the storefront widget, add the Stylique section manually or retry after Shopify theme-write access is fixed.
            </p>
            <div className="mt-4 grid gap-2 text-sm text-amber-50/85 md:grid-cols-2">
              <div className="rounded-lg bg-black/20 p-3">
                <strong className="block text-amber-50">Manual setup steps</strong>
                <ol className="mt-2 list-decimal space-y-1 pl-4">
                  <li>Create <code>sections/stylique-virtual-try-on.liquid</code>.</li>
                  <li>Paste the Stylique Liquid section code.</li>
                  <li>Create <code>assets/stylique.css</code>.</li>
                  <li>Paste the Stylique CSS asset code.</li>
                  <li>Add the Stylique section to the product template and save.</li>
                </ol>
              </div>
              <div className="rounded-lg bg-black/20 p-3">
                <strong className="block text-amber-50">Copy install code</strong>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => copyThemeAsset('section')}>
                    <Clipboard className="h-4 w-4" />
                    Copy Liquid
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => copyThemeAsset('css')}>
                    <Clipboard className="h-4 w-4" />
                    Copy CSS
                  </Button>
                </div>
                {themeInjection.themeName && (
                  <p className="mt-3 text-xs text-amber-50/70">
                    Theme: {themeInjection.themeName}{themeInjection.themeId ? ` (${themeInjection.themeId})` : ''}
                  </p>
                )}
              </div>
            </div>
            {themeCopyStatus && <p className="mt-3 text-sm font-semibold text-amber-50">{themeCopyStatus}</p>}
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-bold text-amber-100/80">View setup detail</summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-black/35 p-3 text-xs leading-5 text-amber-50/75">
                {themeDetails}
              </pre>
            </details>
          </AlertBanner>
        </motion.div>
      )}

      {themeInjection && themeInjection.done && (
        <motion.div variants={fade}>
          <AlertBanner tone="success" title="Widget installed">
            Stylique is installed in your Shopify theme and ready for shoppers.
          </AlertBanner>
        </motion.div>
      )}

      <motion.div variants={fade} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Products"
          value={formatNumber(inventory.length)}
          detail="Synced and manually added inventory"
          icon={Package}
          accent="white"
        />
        <MetricCard
          label="Try-on ready"
          value={formatNumber(insights.tryonReadyCount)}
          detail={`${insights.readiness}% of inventory is ready`}
          icon={CheckCircle2}
          accent="emerald"
        />
        <MetricCard
          label="Try-ons"
          value={formatNumber(tryonCount)}
          detail="Customer try-on events tracked"
          icon={TrendingUp}
          accent="teal"
        />
        <MetricCard
          label="Quota left"
          value={insights.quotaRemaining == null ? 'Ready' : formatNumber(insights.quotaRemaining)}
          detail={storeConfig ? `${insights.quotaUsage}% of quota used` : 'Plan data will appear here'}
          icon={Star}
          accent="amber"
        />
      </motion.div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <motion.div variants={fade}>
          <Card className="h-full">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <Badge variant={insights.readiness >= 70 ? 'success' : insights.readiness >= 35 ? 'warning' : 'danger'}>
                  Readiness Score
                </Badge>
                <h2 className="mt-4 text-2xl font-black text-white">Storefront try-on health</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                  Tier 1 and Tier 2 products with selected try-on imagery create the best customer experience.
                </p>
              </div>
              <div
                className="grid h-36 w-36 shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#14b8a6 ${insights.readiness * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
                }}
              >
                <div className="grid h-28 w-28 place-items-center rounded-full bg-[#090909]">
                  <div className="text-center">
                    <p className="text-3xl font-black text-white">{insights.readiness}%</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">Ready</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {[
                { label: 'Tier 1', value: insights.tierCounts[1], color: 'bg-emerald-400', text: 'Full try-on' },
                { label: 'Tier 2', value: insights.tierCounts[2], color: 'bg-teal-300', text: 'Limited angle' },
                { label: 'Tier 3', value: insights.tierCounts[3], color: 'bg-amber-300', text: 'Size only' },
                { label: 'Unscored', value: insights.tierCounts.none, color: 'bg-zinc-500', text: 'Needs review' },
              ].map((tier) => {
                const pct = inventory.length ? Math.round((tier.value / inventory.length) * 100) : 0;
                return (
                  <div key={tier.label}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${tier.color}`} />
                        <span className="font-bold text-white">{tier.label}</span>
                        <span className="text-zinc-600">{tier.text}</span>
                      </div>
                      <span className="font-bold text-zinc-300">{tier.value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className={`h-full rounded-full ${tier.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        <motion.div variants={fade}>
          <Card className="h-full">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Badge variant="primary">Action Needed</Badge>
                <h2 className="mt-4 text-2xl font-black text-white">Priority products</h2>
              </div>
              <Button variant="secondary" size="sm" onClick={() => router.push('/manage')}>
                Review all
              </Button>
            </div>

            {insights.attention.length === 0 ? (
              <div className="mt-8 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
                  <div>
                    <p className="font-bold text-emerald-100">Everything looks ready</p>
                    <p className="mt-1 text-sm leading-6 text-emerald-100/70">
                      No failed syncs, unscored products, or missing try-on images in the first review set.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {insights.attention.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => router.push('/manage')}
                    className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-200">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{item.product_name}</p>
                      <p className="text-xs text-zinc-500">
                        {!item.tier ? 'Unscored' : item.tier === 3 ? 'Tier 3 product' : 'Missing try-on image'}
                      </p>
                    </div>
                    <Badge variant={item.sync_status === 'failed' ? 'danger' : 'warning'}>
                      {item.sync_status === 'failed' ? 'Sync failed' : 'Review'}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <motion.div variants={fade}>
          {storeConfig ? (
            <Card>
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Store profile</h2>
                  <p className="text-sm text-zinc-500">Operational account details</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 text-sm">
                {[
                  ['Store name', storeConfig.store_name],
                  ['Email', storeConfig.email || 'Not provided'],
                  ['Phone', storeConfig.phone || 'Not provided'],
                  ['Subscription', storeConfig.subscription_plan || storeConfig.subscription_name || 'Active'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last:border-0 last:pb-0">
                    <span className="text-zinc-500">{label}</span>
                    <span className="truncate text-right font-semibold text-white">{value}</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <EmptyState icon={Store} title="Store profile not loaded" description="Profile details will appear after the backend responds." />
          )}
        </motion.div>

        <motion.div variants={fade}>
          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Quick actions</h2>
                <p className="text-sm text-zinc-500">Move the store forward in one click</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                { href: '/upload', icon: Upload, title: 'Upload Product', desc: 'Add a manual item' },
                { href: '/manage', icon: Package, title: 'Manage Inventory', desc: 'Review tiers and images' },
                { href: '/analytics', icon: BarChart3, title: 'Analytics', desc: 'Track try-on events' },
                { href: '/conversions', icon: Layers, title: 'Conversions', desc: 'Watch cart movement' },
              ].map((action) => (
                <button
                  key={action.href}
                  onClick={() => router.push(action.href)}
                  className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
                >
                  <action.icon className="h-5 w-5 text-[#ff8ab0]" />
                  <h3 className="mt-3 text-sm font-bold text-white">{action.title}</h3>
                  <p className="mt-1 text-xs text-zinc-500">{action.desc}</p>
                </button>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
