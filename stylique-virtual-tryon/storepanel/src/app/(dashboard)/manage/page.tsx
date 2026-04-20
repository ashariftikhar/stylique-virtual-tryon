'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  LayoutList,
  Package,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {
  AlertBanner,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  MetricCard,
  PageHeader,
  Skeleton,
} from '@/components/ui';
import { apiClient } from '@/lib/api';
import { classNameMerge, formatUSD } from '@/lib/utils';
import { InventoryItem } from '@/types/api';

type TierFilter = number | null;
type SourceFilter = 'all' | 'shopify' | 'woocommerce' | 'manual';
type SourceKind = Exclude<SourceFilter, 'all'>;
type StatusFilter = 'all' | 'success' | 'pending' | 'failed' | 'manual';
type ReadinessFilter = 'all' | 'ready' | 'attention';
type ViewMode = 'list' | 'grid';

function tierMeta(tier?: number) {
  switch (tier) {
    case 1:
      return { label: 'Tier 1', variant: 'success' as const, detail: 'Full try-on' };
    case 2:
      return { label: 'Tier 2', variant: 'teal' as const, detail: 'Limited angle' };
    case 3:
      return { label: 'Tier 3', variant: 'warning' as const, detail: 'Size only' };
    default:
      return { label: 'Unscored', variant: 'muted' as const, detail: 'Needs review' };
  }
}

function syncMeta(status?: string) {
  switch (status) {
    case 'success':
      return { label: 'Synced', variant: 'success' as const, icon: CheckCircle2 };
    case 'pending':
      return { label: 'Pending', variant: 'warning' as const, icon: Clock };
    case 'failed':
      return { label: 'Failed', variant: 'danger' as const, icon: XCircle };
    default:
      return { label: 'Manual', variant: 'muted' as const, icon: Package };
  }
}

function sourceOf(item: InventoryItem): SourceKind {
  if (item.shopify_product_id) return 'shopify';
  if (item.woocommerce_product_id) return 'woocommerce';
  return 'manual';
}

function isReady(item: InventoryItem) {
  return Boolean(item.tryon_image_url && item.tier && item.tier <= 2);
}

function primaryImage(item: InventoryItem) {
  if (item.tryon_image_url) return item.tryon_image_url;
  if (item.image_url) return item.image_url;
  if (Array.isArray(item.images)) {
    const image = item.images.find((entry) => (typeof entry === 'string' ? entry : entry.url));
    return typeof image === 'string' ? image : image?.url;
  }
  return '';
}

function hasProcessableImages(item: InventoryItem) {
  return Boolean(item.image_url || item.tryon_image_url || (Array.isArray(item.images) && item.images.length > 0));
}

export default function ManageInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<TierFilter>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [readinessFilter, setReadinessFilter] = useState<ReadinessFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<InventoryItem | null>(null);
  const [overrideState, setOverrideState] = useState<{
    id: string;
    tier: number;
    tryon_image_url: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  const loadInventory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const sessionResponse = await fetch('/api/get-store-session');
      const sessionData = await sessionResponse.json();

      if (!sessionData.authenticated || !sessionData.store?.id) {
        setError('Not authenticated. Please sign in again.');
        return;
      }

      try {
        const data: any = await apiClient.getInventory(sessionData.store.id, 200);
        setInventory(data.inventory || data.products || []);
      } catch {
        setInventory([]);
        setError('Inventory could not be loaded from the backend.');
      }
    } catch {
      setError('Failed to load inventory.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const metrics = useMemo(() => {
    const tierCounts = { 1: 0, 2: 0, 3: 0, none: 0 };
    const sourceCounts = { shopify: 0, woocommerce: 0, manual: 0 };
    let ready = 0;
    let failed = 0;
    let qualityTotal = 0;
    let qualityCount = 0;

    inventory.forEach((item) => {
      if (item.tier === 1) tierCounts[1] += 1;
      else if (item.tier === 2) tierCounts[2] += 1;
      else if (item.tier === 3) tierCounts[3] += 1;
      else tierCounts.none += 1;

      sourceCounts[sourceOf(item)] += 1;
      if (isReady(item)) ready += 1;
      if (item.sync_status === 'failed') failed += 1;
      if (typeof item.quality_score === 'number') {
        qualityTotal += item.quality_score;
        qualityCount += 1;
      }
    });

    return {
      tierCounts,
      sourceCounts,
      ready,
      failed,
      attention: inventory.length - ready,
      qualityAverage: qualityCount ? Math.round(qualityTotal / qualityCount) : 0,
    };
  }, [inventory]);

  const filtered = useMemo(
    () =>
      inventory.filter((item) => {
        const matchesSearch = item.product_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTier = tierFilter === null || item.tier === tierFilter;
        const matchesSource = sourceFilter === 'all' || sourceOf(item) === sourceFilter;
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'manual' ? !item.sync_status : item.sync_status === statusFilter);
        const ready = isReady(item);
        const matchesReadiness =
          readinessFilter === 'all' ||
          (readinessFilter === 'ready' ? ready : !ready || item.sync_status === 'failed');
        return matchesSearch && matchesTier && matchesSource && matchesStatus && matchesReadiness;
      }),
    [inventory, readinessFilter, searchTerm, sourceFilter, statusFilter, tierFilter],
  );

  const selectedItems = useMemo(
    () => inventory.filter((item) => selectedIds.has(item.id)),
    [inventory, selectedIds],
  );

  const drawerItem = useMemo(
    () => inventory.find((item) => item.id === drawerId) || null,
    [drawerId, inventory],
  );

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const allVisibleSelected = filtered.every((item) => prev.has(item.id));
      if (allVisibleSelected) return new Set();
      return new Set(filtered.map((item) => item.id));
    });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await apiClient.updateInventory(pendingDelete.id, { deleted: true });
      setInventory((prev) => prev.filter((item) => item.id !== pendingDelete.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(pendingDelete.id);
        return next;
      });
      setDrawerId((current) => (current === pendingDelete.id ? null : current));
      setNotice(`${pendingDelete.product_name} was removed from inventory.`);
      setPendingDelete(null);
    } catch {
      setError('Failed to delete product.');
    }
  };

  const handleReprocessImages = async (item: InventoryItem) => {
    if (!hasProcessableImages(item)) return;
    setReprocessingId(item.id);
    setError('');
    try {
      const imageMap = new Map<string, { url: string; alt?: string }>();
      const addImage = (url?: string, alt?: string) => {
        if (url && url.startsWith('http') && !imageMap.has(url)) {
          imageMap.set(url, { url, alt });
        }
      };

      if (Array.isArray(item.images)) {
        item.images.forEach((img) => {
          if (typeof img === 'string') addImage(img, item.product_name);
          else addImage(img.url, img.alt || item.product_name);
        });
      }
      addImage(item.image_url, item.product_name);
      addImage(item.tryon_image_url, `${item.product_name} tryon`);

      const images = Array.from(imageMap.values());
      const result: any = await apiClient.processImages(item.id, images);
      setInventory((prev) =>
        prev.map((product) =>
          product.id === item.id
            ? {
                ...product,
                tier: result.tier ?? product.tier,
                tryon_image_url: result.selectedImage?.url ?? product.tryon_image_url,
              }
            : product,
        ),
      );
      setNotice(`${item.product_name} was re-processed.`);
    } catch {
      setError('Failed to re-process images.');
    } finally {
      setReprocessingId(null);
    }
  };

  const handleReprocessSelected = async () => {
    for (const item of selectedItems.filter(hasProcessableImages)) {
      await handleReprocessImages(item);
    }
    setSelectedIds(new Set());
  };

  const openOverride = (item: InventoryItem) => {
    setOverrideState({
      id: item.id,
      tier: item.tier ?? 3,
      tryon_image_url: item.tryon_image_url || '',
    });
  };

  const saveOverride = async () => {
    if (!overrideState) return;
    setSaving(true);
    setError('');
    try {
      await apiClient.updateInventory(overrideState.id, {
        tier: overrideState.tier,
        tryon_image_url: overrideState.tryon_image_url || null,
      });
      setInventory((prev) =>
        prev.map((product) =>
          product.id === overrideState.id
            ? {
                ...product,
                tier: overrideState.tier,
                tryon_image_url: overrideState.tryon_image_url || undefined,
              }
            : product,
        ),
      );
      setNotice('Manual override saved.');
      setOverrideState(null);
    } catch {
      setError('Failed to save override.');
    } finally {
      setSaving(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setTierFilter(null);
    setSourceFilter('all');
    setStatusFilter('all');
    setReadinessFilter('all');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const allVisibleSelected = filtered.length > 0 && filtered.every((item) => selectedIds.has(item.id));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Inventory Atelier"
        title="Manage Inventory"
        description="Review product readiness, re-process images, adjust tiers, and keep the storefront catalog polished."
        action={
          <>
            <Button variant="secondary" onClick={loadInventory}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant={viewMode === 'list' ? 'primary' : 'secondary'} onClick={() => setViewMode('list')} aria-label="List view">
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === 'grid' ? 'primary' : 'secondary'} onClick={() => setViewMode('grid')} aria-label="Grid view">
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </>
        }
      />

      {error && (
        <AlertBanner tone="danger" title="Inventory issue">
          {error}
        </AlertBanner>
      )}

      {notice && (
        <AlertBanner tone="success" title="Done" action={<Button variant="ghost" size="sm" onClick={() => setNotice('')}>Dismiss</Button>}>
          {notice}
        </AlertBanner>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Products" value={inventory.length} detail="Total inventory" icon={Package} />
        <MetricCard label="Ready" value={metrics.ready} detail={`${metrics.attention} need attention`} icon={ShieldCheck} accent="emerald" />
        <MetricCard label="Avg quality" value={`${metrics.qualityAverage}%`} detail="Image scoring average" icon={Sparkles} accent="teal" />
        <MetricCard label="Failed syncs" value={metrics.failed} detail="Requires catalog review" icon={AlertTriangle} accent="rose" />
      </div>

      <Card className="space-y-5">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-600" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search product name..."
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={toggleSelectAll} disabled={filtered.length === 0}>
              {allVisibleSelected ? 'Clear selection' : 'Select visible'}
            </Button>
            <Button
              variant="secondary"
              onClick={handleReprocessSelected}
              disabled={selectedItems.length === 0 || Boolean(reprocessingId)}
              isLoading={Boolean(reprocessingId && selectedItems.some((item) => item.id === reprocessingId))}
            >
              <Layers className="h-4 w-4" />
              Re-process selected
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <select
            value={tierFilter ?? 'all'}
            onChange={(e) => setTierFilter(e.target.value === 'all' ? null : Number(e.target.value))}
            className="h-10 rounded-lg border border-white/10 bg-black/35 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/10"
          >
            <option value="all">All tiers</option>
            <option value="1">Tier 1</option>
            <option value="2">Tier 2</option>
            <option value="3">Tier 3</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
            className="h-10 rounded-lg border border-white/10 bg-black/35 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/10"
          >
            <option value="all">All sources</option>
            <option value="shopify">Shopify</option>
            <option value="woocommerce">WooCommerce</option>
            <option value="manual">Manual</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-10 rounded-lg border border-white/10 bg-black/35 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/10"
          >
            <option value="all">All sync states</option>
            <option value="success">Synced</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="manual">Manual</option>
          </select>
          <select
            value={readinessFilter}
            onChange={(e) => setReadinessFilter(e.target.value as ReadinessFilter)}
            className="h-10 rounded-lg border border-white/10 bg-black/35 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/10"
          >
            <option value="all">All readiness</option>
            <option value="ready">Try-on ready</option>
            <option value="attention">Needs attention</option>
          </select>
          <Button variant="ghost" onClick={resetFilters}>
            Reset filters
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Tier 1', count: metrics.tierCounts[1], filter: 1, variant: 'success' as const },
            { label: 'Tier 2', count: metrics.tierCounts[2], filter: 2, variant: 'teal' as const },
            { label: 'Tier 3', count: metrics.tierCounts[3], filter: 3, variant: 'warning' as const },
            { label: 'Unscored', count: metrics.tierCounts.none, filter: null, variant: 'muted' as const },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => setTierFilter(tierFilter === item.filter ? null : item.filter)}
              className={classNameMerge(
                'rounded-lg border p-3 text-left transition',
                tierFilter === item.filter
                  ? 'border-white bg-white text-black'
                  : 'border-white/10 bg-white/[0.035] hover:border-white/20',
              )}
            >
              <Badge variant={item.variant}>{item.label}</Badge>
              <p className="mt-3 text-2xl font-black">{item.count}</p>
            </button>
          ))}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={inventory.length === 0 ? 'No products yet' : 'No products match your filters'}
          description={inventory.length === 0 ? 'Synced and uploaded products will appear here.' : 'Clear filters or search for another product name.'}
          action={inventory.length > 0 ? <Button onClick={resetFilters}>Clear filters</Button> : undefined}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              selected={selectedIds.has(item.id)}
              reprocessing={reprocessingId === item.id}
              onSelect={() => toggleSelected(item.id)}
              onOpen={() => setDrawerId(item.id)}
              onOverride={() => openOverride(item)}
              onReprocess={() => handleReprocessImages(item)}
              onDelete={() => setPendingDelete(item)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <ProductRow
              key={item.id}
              item={item}
              selected={selectedIds.has(item.id)}
              reprocessing={reprocessingId === item.id}
              onSelect={() => toggleSelected(item.id)}
              onOpen={() => setDrawerId(item.id)}
              onOverride={() => openOverride(item)}
              onReprocess={() => handleReprocessImages(item)}
              onDelete={() => setPendingDelete(item)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {drawerItem && (
          <ProductDrawer
            item={drawerItem}
            reprocessing={reprocessingId === drawerItem.id}
            onClose={() => setDrawerId(null)}
            onOverride={() => openOverride(drawerItem)}
            onReprocess={() => handleReprocessImages(drawerItem)}
            onDelete={() => setPendingDelete(drawerItem)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {overrideState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
            onClick={() => setOverrideState(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-lg border border-white/10 bg-zinc-950 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Badge variant="primary">Manual Override</Badge>
                  <h3 className="mt-3 text-xl font-black text-white">Set tier and image</h3>
                </div>
                <button
                  onClick={() => setOverrideState(null)}
                  className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Close override modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-300">Tier Assignment</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((tier) => (
                      <button
                        key={tier}
                        onClick={() => setOverrideState((state) => (state ? { ...state, tier } : null))}
                        className={classNameMerge(
                          'h-10 rounded-lg border text-sm font-bold transition',
                          overrideState.tier === tier
                            ? 'border-white bg-white text-black'
                            : 'border-white/10 bg-white/[0.035] text-zinc-400 hover:text-white',
                        )}
                      >
                        Tier {tier}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-300" htmlFor="tryonImageUrl">
                    Primary Try-on Image URL
                  </label>
                  <Input
                    id="tryonImageUrl"
                    type="url"
                    value={overrideState.tryon_image_url}
                    onChange={(e) =>
                      setOverrideState((state) =>
                        state ? { ...state, tryon_image_url: e.target.value } : null,
                      )
                    }
                    placeholder="https://..."
                  />
                </div>

                {overrideState.tryon_image_url && (
                  <div
                    className="h-40 rounded-lg border border-white/10 bg-cover bg-center"
                    style={{ backgroundImage: `url(${overrideState.tryon_image_url})` }}
                    aria-label="Try-on image preview"
                  />
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setOverrideState(null)}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={saveOverride} isLoading={saving}>
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
            onClick={() => setPendingDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-lg border border-red-400/20 bg-zinc-950 p-6 shadow-2xl"
            >
              <Badge variant="danger">Delete Product</Badge>
              <h3 className="mt-4 text-xl font-black text-white">Remove this inventory item?</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                {pendingDelete.product_name} will be removed from the panel. This action cannot be undone from here.
              </p>
              <div className="mt-6 flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setPendingDelete(null)}>
                  Cancel
                </Button>
                <Button variant="danger" className="flex-1" onClick={confirmDelete}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductRow({
  item,
  selected,
  reprocessing,
  onSelect,
  onOpen,
  onOverride,
  onReprocess,
  onDelete,
}: ProductViewProps) {
  const tier = tierMeta(item.tier);
  const sync = syncMeta(item.sync_status);
  const SyncIcon = sync.icon;
  const image = primaryImage(item);

  return (
    <motion.div
      layout
      className="rounded-lg border border-white/10 bg-zinc-950/70 p-4 transition hover:border-white/20 hover:bg-zinc-900/70"
    >
      <div className="flex items-center gap-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="h-4 w-4 rounded border-white/20 bg-black accent-white"
          aria-label={`Select ${item.product_name}`}
        />
        <button
          onClick={onOpen}
          className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-900"
          aria-label={`Open ${item.product_name}`}
        >
          {image ? (
            <span className="block h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} />
          ) : (
            <span className="grid h-full w-full place-items-center text-zinc-600">
              <ImageIcon className="h-5 w-5" />
            </span>
          )}
        </button>
        <button onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-black text-white">{item.product_name}</h3>
            <Badge variant={tier.variant}>{tier.label}</Badge>
            <Badge variant={sync.variant}>
              <SyncIcon className="h-3 w-3" />
              {sync.label}
            </Badge>
            {isReady(item) && <Badge variant="success">Ready</Badge>}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
            {item.price != null && <span>{formatUSD(Number(item.price))}</span>}
            <span className="capitalize">{sourceOf(item)}</span>
            {item.sizes?.length > 0 && <span>{item.sizes.join(', ')}</span>}
            {typeof item.quality_score === 'number' && <span>Quality {item.quality_score}%</span>}
          </div>
        </button>
        <ProductActions
          item={item}
          reprocessing={reprocessing}
          onOverride={onOverride}
          onReprocess={onReprocess}
          onDelete={onDelete}
        />
      </div>
    </motion.div>
  );
}

function ProductCard(props: ProductViewProps) {
  const { item, selected, reprocessing, onSelect, onOpen, onOverride, onReprocess, onDelete } = props;
  const tier = tierMeta(item.tier);
  const sync = syncMeta(item.sync_status);
  const SyncIcon = sync.icon;
  const image = primaryImage(item);

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-lg border border-white/10 bg-zinc-950/70 transition hover:border-white/20"
    >
      <button onClick={onOpen} className="relative block h-56 w-full bg-zinc-900 text-left">
        {image ? (
          <span className="block h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} />
        ) : (
          <span className="grid h-full w-full place-items-center text-zinc-600">
            <ImageIcon className="h-9 w-9" />
          </span>
        )}
        <span className="absolute left-3 top-3 flex gap-2">
          <Badge variant={tier.variant}>{tier.label}</Badge>
          {isReady(item) && <Badge variant="success">Ready</Badge>}
        </span>
      </button>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            className="mt-1 h-4 w-4 rounded border-white/20 bg-black accent-white"
            aria-label={`Select ${item.product_name}`}
          />
          <div className="min-w-0 flex-1">
            <button onClick={onOpen} className="block w-full text-left">
              <h3 className="truncate text-sm font-black text-white">{item.product_name}</h3>
              <p className="mt-1 text-xs text-zinc-500">{tier.detail}</p>
            </button>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={sync.variant}>
                <SyncIcon className="h-3 w-3" />
                {sync.label}
              </Badge>
              <Badge variant="default" className="capitalize">
                {sourceOf(item)}
              </Badge>
            </div>
          </div>
        </div>
        <ProductActions
          item={item}
          reprocessing={reprocessing}
          onOverride={onOverride}
          onReprocess={onReprocess}
          onDelete={onDelete}
          compact
        />
      </div>
    </motion.div>
  );
}

type ProductViewProps = {
  item: InventoryItem;
  selected: boolean;
  reprocessing: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onOverride: () => void;
  onReprocess: () => void;
  onDelete: () => void;
};

function ProductActions({
  item,
  reprocessing,
  onOverride,
  onReprocess,
  onDelete,
  compact = false,
}: {
  item: InventoryItem;
  reprocessing: boolean;
  onOverride: () => void;
  onReprocess: () => void;
  onDelete: () => void;
  compact?: boolean;
}) {
  return (
    <div className={classNameMerge('flex shrink-0 flex-wrap gap-2', compact ? 'mt-4' : 'justify-end')}>
      <Button
        variant="secondary"
        size="sm"
        onClick={onReprocess}
        disabled={!hasProcessableImages(item) || reprocessing}
        isLoading={reprocessing}
      >
        {!reprocessing && <Layers className="h-4 w-4" />}
        Re-process
      </Button>
      <Button variant="secondary" size="sm" onClick={onOverride}>
        <Star className="h-4 w-4" />
        Override
      </Button>
      <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-300">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ProductDrawer({
  item,
  reprocessing,
  onClose,
  onOverride,
  onReprocess,
  onDelete,
}: {
  item: InventoryItem;
  reprocessing: boolean;
  onClose: () => void;
  onOverride: () => void;
  onReprocess: () => void;
  onDelete: () => void;
}) {
  const tier = tierMeta(item.tier);
  const image = primaryImage(item);
  const source = sourceOf(item);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.aside
        initial={{ x: 420 }}
        animate={{ x: 0 }}
        exit={{ x: 420 }}
        transition={{ type: 'spring', damping: 30, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
        className="ml-auto flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-zinc-950 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <Badge variant={tier.variant}>{tier.label}</Badge>
            <h2 className="mt-3 text-xl font-black text-white">{item.product_name}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Close product details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="overflow-hidden rounded-lg border border-white/10 bg-black/35">
            {image ? (
              <div className="h-80 bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} />
            ) : (
              <div className="grid h-80 place-items-center text-zinc-600">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ['Try-on Ready', isReady(item) ? 'Yes' : 'No'],
              ['Source', source],
              ['Quality Score', `${item.quality_score ?? 0}%`],
              ['Updated', item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'Not available'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">{label}</p>
                <p className="mt-2 text-sm font-bold capitalize text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-600">Sizing</p>
            <p className="mt-2 text-sm text-zinc-300">{item.sizes?.length ? item.sizes.join(', ') : 'No sizes listed'}</p>
          </div>

          {item.product_link && (
            <a
              href={item.product_link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-white underline-offset-4 hover:underline"
            >
              View product on store
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        <div className="border-t border-white/10 p-5">
          <ProductActions
            item={item}
            reprocessing={reprocessing}
            onOverride={onOverride}
            onReprocess={onReprocess}
            onDelete={onDelete}
          />
        </div>
      </motion.aside>
    </motion.div>
  );
}
