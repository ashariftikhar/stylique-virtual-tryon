'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Package,
  Upload,
  TrendingUp,
  Store,
  Mail,
  Phone,
  BarChart3,
  Layers,
  CheckCircle,
  Star,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { StoreConfig, InventoryItem } from '@/types/api';

const fade = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export default function StorePanelHome() {
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [tryonCount, setTryonCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      try {
        const sessionResponse = await fetch('/api/get-store-session');
        const sessionData = await sessionResponse.json();

        if (!sessionData.authenticated || !sessionData.store?.id) {
          router.push('/login');
          return;
        }

        const storeId = sessionData.store.id;

        try {
          const config: any = await apiClient.getStoreConfig(storeId);
          setStoreConfig(config.config);
        } catch {
          // config endpoint may not be ready
        }

        try {
          const inv: any = await apiClient.getInventory(storeId, 200);
          setInventory(inv.inventory || inv.products || []);
        } catch {
          // inventory endpoint may not be ready
        }

        try {
          const analytics: any = await apiClient.getAnalytics(storeId, 1);
          setTryonCount(analytics.total ?? analytics.analytics?.length ?? 0);
        } catch {
          // analytics endpoint may not be ready
        }
      } catch (error) {
        console.error('Error loading store data:', error);
        setError('Failed to load store data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#642FD7] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  const storeName = storeConfig?.store_name?.split(' ')[0] || 'Store';

  // Tier & readiness stats
  const tierCounts = { 1: 0, 2: 0, 3: 0 };
  let tryonReadyCount = 0;
  inventory.forEach((i) => {
    if (i.tier === 1) tierCounts[1]++;
    else if (i.tier === 2) tierCounts[2]++;
    else tierCounts[3]++;
    if (i.tryon_image_url && i.tier && i.tier <= 2) tryonReadyCount++;
  });

  const quota = storeConfig
    ? Math.max(0, storeConfig.tryons_quota - storeConfig.tryons_used)
    : null;

  return (
    <motion.div
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
    >
      {/* Welcome */}
      <motion.div variants={fade}>
        <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
          Welcome back, {storeName}!
        </h1>
        <p className="text-gray-400 text-sm">
          Manage your inventory and track customer engagement
        </p>
      </motion.div>

      {/* Primary stats */}
      <motion.div variants={fade} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-[#642FD7] to-[#F4536F] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs mb-1">Total Products</p>
              <p className="text-white text-3xl font-bold">{inventory.length}</p>
            </div>
            <Package className="w-10 h-10 text-white/20" />
          </div>
        </div>

        <div className="rounded-2xl bg-gray-900/40 border border-gray-800/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs mb-1">Try-on Ready</p>
              <p className="text-emerald-400 text-3xl font-bold">{tryonReadyCount}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-gray-700" />
          </div>
        </div>

        <div className="rounded-2xl bg-gray-900/40 border border-gray-800/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs mb-1">Total Try-ons</p>
              <p className="text-white text-3xl font-bold">{tryonCount}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-gray-700" />
          </div>
        </div>

        <div className="rounded-2xl bg-gray-900/40 border border-gray-800/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs mb-1">Remaining Quota</p>
              <p className="text-white text-3xl font-bold">{quota ?? '—'}</p>
            </div>
            <Star className="w-10 h-10 text-gray-700" />
          </div>
        </div>
      </motion.div>

      {/* Tier breakdown */}
      {inventory.length > 0 && (
        <motion.div variants={fade}>
          <div className="rounded-2xl bg-gray-900/40 border border-gray-800/60 p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#642FD7]" />
              Product Tier Distribution
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-emerald-950/30 border border-emerald-900/30 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{tierCounts[1]}</p>
                <p className="text-xs text-emerald-500/70 mt-1">Tier 1 — Full Try-on</p>
              </div>
              <div className="rounded-xl bg-blue-950/30 border border-blue-900/30 p-4 text-center">
                <p className="text-2xl font-bold text-blue-400">{tierCounts[2]}</p>
                <p className="text-xs text-blue-500/70 mt-1">Tier 2 — Limited</p>
              </div>
              <div className="rounded-xl bg-amber-950/30 border border-amber-900/30 p-4 text-center">
                <p className="text-2xl font-bold text-amber-400">{tierCounts[3]}</p>
                <p className="text-xs text-amber-500/70 mt-1">Tier 3 — Size Only</p>
              </div>
            </div>
            {/* Progress bar */}
            {inventory.length > 0 && (
              <div className="mt-4 h-2 rounded-full bg-gray-800 overflow-hidden flex">
                {tierCounts[1] > 0 && (
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${(tierCounts[1] / inventory.length) * 100}%` }}
                  />
                )}
                {tierCounts[2] > 0 && (
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${(tierCounts[2] / inventory.length) * 100}%` }}
                  />
                )}
                {tierCounts[3] > 0 && (
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${(tierCounts[3] / inventory.length) * 100}%` }}
                  />
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Store Information */}
      {storeConfig && (
        <motion.div variants={fade} className="rounded-2xl bg-gray-900/40 border border-gray-800/60 p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Store className="w-4 h-4 text-[#642FD7]" />
            Store Information
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-3 bg-gray-800/40 rounded-lg">
              <p className="text-gray-500 text-xs mb-0.5">Store Name</p>
              <p className="text-white text-sm font-medium">{storeConfig.store_name}</p>
            </div>
            {storeConfig.email && (
              <div className="p-3 bg-gray-800/40 rounded-lg">
                <p className="text-gray-500 text-xs mb-0.5 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </p>
                <p className="text-white text-sm font-medium">{storeConfig.email}</p>
              </div>
            )}
            {storeConfig.phone && (
              <div className="p-3 bg-gray-800/40 rounded-lg">
                <p className="text-gray-500 text-xs mb-0.5 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Phone
                </p>
                <p className="text-white text-sm font-medium">{storeConfig.phone}</p>
              </div>
            )}
            {(storeConfig.subscription_plan || storeConfig.subscription_name) && (
              <div className="p-3 bg-gray-800/40 rounded-lg">
                <p className="text-gray-500 text-xs mb-0.5">Subscription</p>
                <p className="text-white text-sm font-medium">
                  {storeConfig.subscription_plan || storeConfig.subscription_name}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div variants={fade} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            href: '/upload',
            icon: Upload,
            title: 'Upload Product',
            desc: 'Add a new item manually',
          },
          {
            href: '/manage',
            icon: Package,
            title: 'Manage Inventory',
            desc: 'View scores & overrides',
          },
          {
            href: '/analytics',
            icon: BarChart3,
            title: 'Analytics',
            desc: 'Try-on performance',
          },
          {
            href: '/conversions',
            icon: TrendingUp,
            title: 'Conversions',
            desc: 'Cart & purchase tracking',
          },
        ].map((action) => (
          <button
            key={action.href}
            onClick={() => router.push(action.href)}
            className="p-4 rounded-xl bg-gray-900/40 border border-gray-800/60 hover:border-[#642FD7]/40 transition-all text-left group"
          >
            <action.icon className="w-5 h-5 text-[#642FD7] mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-white text-sm">{action.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{action.desc}</p>
          </button>
        ))}
      </motion.div>
    </motion.div>
  );
}
