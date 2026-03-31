'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Loader2,
  AlertCircle,
  Search,
  Trash2,
  Image as ImageIcon,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  Star,
  Layers,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Save,
  X,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { InventoryItem } from '@/types/api';

function tierLabel(tier?: number): { text: string; color: string } {
  switch (tier) {
    case 1:
      return { text: 'Tier 1', color: 'bg-emerald-900/30 text-emerald-300 border-emerald-800/50' };
    case 2:
      return { text: 'Tier 2', color: 'bg-blue-900/30 text-blue-300 border-blue-800/50' };
    case 3:
      return { text: 'Tier 3', color: 'bg-amber-900/30 text-amber-300 border-amber-800/50' };
    default:
      return { text: 'Unscored', color: 'bg-gray-800/50 text-gray-400 border-gray-700/50' };
  }
}

function syncBadge(status?: string) {
  switch (status) {
    case 'success':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-900/30 text-emerald-300 border border-emerald-800/50">
          <CheckCircle className="w-3 h-3" /> Synced
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-900/30 text-amber-300 border border-amber-800/50">
          <Clock className="w-3 h-3" /> Pending
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-900/30 text-red-300 border border-red-800/50">
          <XCircle className="w-3 h-3" /> Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-800/50 text-gray-500 border border-gray-700/50">
          Manual
        </span>
      );
  }
}

export default function ManageInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
        setError('Not authenticated');
        return;
      }

      try {
        const data: any = await apiClient.getInventory(sessionData.store.id, 200);
        setInventory(data.inventory || data.products || []);
      } catch {
        setInventory([]);
      }
    } catch (err) {
      console.error('Error loading inventory:', err);
      setError('Failed to load inventory');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const handleDelete = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await apiClient.updateInventory(productId, { deleted: true });
      setInventory((prev) => prev.filter((item) => item.id !== productId));
    } catch {
      alert('Failed to delete product');
    }
  };

  const handleReprocessImages = async (item: InventoryItem) => {
    if (!item.image_url) return;
    setReprocessingId(item.id);
    try {
      const images = [{ url: item.image_url, alt: item.product_name }];
      if (item.tryon_image_url && item.tryon_image_url !== item.image_url) {
        images.push({ url: item.tryon_image_url, alt: `${item.product_name} tryon` });
      }
      const result: any = await apiClient.processImages(item.id, images);
      setInventory((prev) =>
        prev.map((p) =>
          p.id === item.id
            ? {
                ...p,
                tier: result.tier ?? p.tier,
                tryon_image_url: result.selectedImage?.url ?? p.tryon_image_url,
              }
            : p
        )
      );
    } catch (err) {
      console.error('Re-process failed', err);
      alert('Failed to re-process images');
    } finally {
      setReprocessingId(null);
    }
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
    try {
      await apiClient.updateInventory(overrideState.id, {
        tier: overrideState.tier,
        tryon_image_url: overrideState.tryon_image_url || null,
      });
      setInventory((prev) =>
        prev.map((p) =>
          p.id === overrideState.id
            ? {
                ...p,
                tier: overrideState.tier,
                tryon_image_url: overrideState.tryon_image_url || undefined,
              }
            : p
        )
      );
      setOverrideState(null);
    } catch (err) {
      console.error('Override save failed', err);
      alert('Failed to save override');
    } finally {
      setSaving(false);
    }
  };

  const filtered = inventory.filter((item) => {
    const matchesSearch = item.product_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesTier = tierFilter === null || item.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  // Summaries
  const tierCounts = { 1: 0, 2: 0, 3: 0, none: 0 };
  inventory.forEach((i) => {
    if (i.tier === 1) tierCounts[1]++;
    else if (i.tier === 2) tierCounts[2]++;
    else if (i.tier === 3) tierCounts[3]++;
    else tierCounts.none++;
  });
  const tryonReadyCount = inventory.filter(
    (i) => i.tryon_image_url && i.tier && i.tier <= 2
  ).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#642FD7]" />
          <p className="text-white">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Manage Inventory</h1>
          <p className="text-gray-400 text-sm">
            {inventory.length} product{inventory.length !== 1 ? 's' : ''} &middot;{' '}
            {tryonReadyCount} try-on ready
          </p>
        </div>
        <button
          onClick={loadInventory}
          className="shrink-0 px-4 py-2 rounded-lg border border-gray-800 text-gray-300 hover:border-gray-700 transition-colors flex items-center gap-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Tier 1', count: tierCounts[1], color: 'text-emerald-400', filter: 1 },
          { label: 'Tier 2', count: tierCounts[2], color: 'text-blue-400', filter: 2 },
          { label: 'Tier 3', count: tierCounts[3], color: 'text-amber-400', filter: 3 },
          { label: 'Unscored', count: tierCounts.none, color: 'text-gray-500', filter: 0 },
        ].map((t) => (
          <button
            key={t.label}
            onClick={() =>
              setTierFilter(tierFilter === (t.filter || null) ? null : t.filter || null)
            }
            className={`rounded-xl p-4 text-left transition-all border ${
              tierFilter === (t.filter || null)
                ? 'bg-gray-800/80 border-[#642FD7]/50'
                : 'bg-gray-900/40 border-gray-800/60 hover:border-gray-700'
            }`}
          >
            <p className={`text-2xl font-bold ${t.color}`}>{t.count}</p>
            <p className="text-xs text-gray-500 mt-1">{t.label}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-900/50 border border-gray-800 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#642FD7]/50 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-900/50 text-red-300 flex items-start gap-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Products list */}
      {filtered.length === 0 ? (
        <div className="p-12 rounded-2xl bg-gray-900/30 border border-gray-800/60 text-center">
          <Package className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400">
            {inventory.length === 0 ? 'No products yet' : 'No products match your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const tier = tierLabel(item.tier);
            const expanded = expandedId === item.id;

            return (
              <motion.div
                key={item.id}
                layout
                className="rounded-xl bg-gray-900/40 border border-gray-800/60 overflow-hidden hover:border-gray-700/80 transition-colors"
              >
                {/* Row header */}
                <div className="flex items-center gap-3 p-4">
                  {/* Image */}
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-800 shrink-0">
                    {item.tryon_image_url || item.image_url ? (
                      <img
                        src={item.tryon_image_url || item.image_url}
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                    {item.tryon_image_url && (
                      <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-gray-900 flex items-center justify-center">
                        <Star className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white text-sm truncate max-w-[200px]">
                        {item.product_name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${tier.color}`}>
                        {tier.text}
                      </span>
                      {syncBadge(item.sync_status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {item.price != null && <span>${Number(item.price).toFixed(2)}</span>}
                      {item.sizes && item.sizes.length > 0 && (
                        <span>{Array.isArray(item.sizes) ? item.sizes.join(', ') : ''}</span>
                      )}
                      {item.shopify_product_id && (
                        <span className="text-[#642FD7]">Shopify</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setExpandedId(expanded ? null : item.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
                      title="Details"
                    >
                      {expanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-gray-800/40">
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Left: images */}
                          <div className="space-y-3">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Images
                            </p>
                            <div className="flex gap-3">
                              {item.image_url && (
                                <div className="space-y-1">
                                  <img
                                    src={item.image_url}
                                    alt="Product"
                                    className="w-24 h-32 object-cover rounded-lg border border-gray-700"
                                  />
                                  <p className="text-[10px] text-gray-500 text-center">Original</p>
                                </div>
                              )}
                              {item.tryon_image_url && (
                                <div className="space-y-1">
                                  <div className="relative">
                                    <img
                                      src={item.tryon_image_url}
                                      alt="Try-on"
                                      className="w-24 h-32 object-cover rounded-lg border-2 border-emerald-600/50"
                                    />
                                    <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-emerald-600 text-[9px] font-bold text-white">
                                      PRIMARY
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-emerald-400 text-center">
                                    Try-on Image
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: metadata */}
                          <div className="space-y-3">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Details
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="rounded-lg bg-gray-800/40 px-3 py-2">
                                <p className="text-[10px] text-gray-500 uppercase">Tier</p>
                                <p className="text-white font-medium">
                                  {item.tier ? `Tier ${item.tier}` : 'Unscored'}
                                </p>
                              </div>
                              <div className="rounded-lg bg-gray-800/40 px-3 py-2">
                                <p className="text-[10px] text-gray-500 uppercase">Try-on Ready</p>
                                <p
                                  className={`font-medium ${
                                    item.tryon_image_url && item.tier && item.tier <= 2
                                      ? 'text-emerald-400'
                                      : 'text-gray-500'
                                  }`}
                                >
                                  {item.tryon_image_url && item.tier && item.tier <= 2
                                    ? 'Yes'
                                    : 'No'}
                                </p>
                              </div>
                              <div className="rounded-lg bg-gray-800/40 px-3 py-2">
                                <p className="text-[10px] text-gray-500 uppercase">Source</p>
                                <p className="text-white font-medium">
                                  {item.shopify_product_id
                                    ? 'Shopify'
                                    : item.woocommerce_product_id
                                    ? 'WooCommerce'
                                    : 'Manual'}
                                </p>
                              </div>
                              <div className="rounded-lg bg-gray-800/40 px-3 py-2">
                                <p className="text-[10px] text-gray-500 uppercase">Updated</p>
                                <p className="text-white font-medium text-xs">
                                  {item.updated_at
                                    ? new Date(item.updated_at).toLocaleDateString()
                                    : '—'}
                                </p>
                              </div>
                            </div>

                            {item.product_link && (
                              <a
                                href={item.product_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-[#642FD7] hover:underline"
                              >
                                View on store <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-800/40">
                          <button
                            onClick={() => handleReprocessImages(item)}
                            disabled={reprocessingId === item.id || !item.image_url}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-300 hover:border-[#642FD7]/50 hover:text-white disabled:opacity-40 transition-colors flex items-center gap-1.5"
                          >
                            {reprocessingId === item.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Layers className="w-3 h-3" />
                            )}
                            Re-process Images
                          </button>
                          <button
                            onClick={() => openOverride(item)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-300 hover:border-[#642FD7]/50 hover:text-white transition-colors flex items-center gap-1.5"
                          >
                            <Star className="w-3 h-3" />
                            Manual Override
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Override modal */}
      <AnimatePresence>
        {overrideState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setOverrideState(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Manual Override</h3>
                <button
                  onClick={() => setOverrideState(null)}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tier selector */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tier Assignment
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((t) => (
                    <button
                      key={t}
                      onClick={() =>
                        setOverrideState((s) => (s ? { ...s, tier: t } : null))
                      }
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${
                        overrideState.tier === t
                          ? 'bg-[#642FD7]/20 border-[#642FD7] text-white'
                          : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      Tier {t}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Tier 1 = full try-on, Tier 2 = limited angles, Tier 3 = size-only
                </p>
              </div>

              {/* Primary image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Primary Try-on Image URL
                </label>
                <input
                  type="url"
                  value={overrideState.tryon_image_url}
                  onChange={(e) =>
                    setOverrideState((s) =>
                      s ? { ...s, tryon_image_url: e.target.value } : null
                    )
                  }
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-lg bg-gray-800/50 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#642FD7]/50"
                />
              </div>

              {/* Preview */}
              {overrideState.tryon_image_url && (
                <div className="flex justify-center">
                  <img
                    src={overrideState.tryon_image_url}
                    alt="Preview"
                    className="h-32 rounded-lg border border-gray-700 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Save */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setOverrideState(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-700 text-gray-300 hover:bg-gray-800/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveOverride}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-[#642FD7] to-[#F4536F] text-white hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Override
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
