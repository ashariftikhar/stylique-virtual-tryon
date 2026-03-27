'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Package, Upload, TrendingUp, Store, Mail, Phone } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { StoreConfig, InventoryItem, TryonAnalytics } from '@/types/api';

export default function StorePanelHome() {
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [tryonCount, setTryonCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get store session to find store ID
        const sessionResponse = await fetch('/api/get-store-session');
        const sessionData = await sessionResponse.json();

        if (!sessionData.authenticated || !sessionData.store?.id) {
          router.push('/auth/login');
          return;
        }

        const storeId = sessionData.store.id;

        // Fetch store config from backend API
        try {
          const config = await apiClient.getStoreConfig(storeId);
          setStoreConfig(config.config);
          setInventoryCount(config.config?.tryons_quota || 0);
        } catch (err) {
          console.warn('Could not fetch from backend API, using session data');
        }

        // TODO: Fetch inventory and analytics from actual backend endpoints
        // when they're implemented
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
          <div className="w-12 h-12 border-4 border-[#642FD7] border-t-transparent rounded-full animate-spin mx-auto"></div>
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

  return (
    <motion.div
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
    >
      {/* Welcome Section */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        }}
      >
        <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
          Welcome back, {storeName}!
        </h1>
        <p className="text-gray-400 max-w-2xl">
          Manage your inventory and track customer engagement with virtual try-ons
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        }}
        className="grid md:grid-cols-3 gap-6"
      >
        {/* Products Card */}
        <div className="rounded-2xl bg-gradient-to-r from-[#642FD7] to-[#F4536F] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-100 text-sm mb-2">Total Products</p>
              <p className="text-white text-3xl font-bold">{inventoryCount}</p>
            </div>
            <Package className="w-12 h-12 text-white/20" />
          </div>
        </div>

        {/* Try-ons Card */}
        <div className="rounded-2xl bg-gray-900/50 border border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-2">Total Try-ons</p>
              <p className="text-white text-3xl font-bold">{tryonCount}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-gray-600" />
          </div>
        </div>

        {/* Quota Card */}
        <div className="rounded-2xl bg-gray-900/50 border border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-2">Remaining Quota</p>
              <p className="text-white text-3xl font-bold">
                {storeConfig ? storeConfig.tryons_remaining : '—'}
              </p>
            </div>
            <Upload className="w-12 h-12 text-gray-600" />
          </div>
        </div>
      </motion.div>

      {/* Store Information */}
      {storeConfig && (
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          className="rounded-2xl bg-gray-900/50 border border-gray-800 p-6"
        >
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Store className="w-5 h-5" />
            Store Information
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Store Name</p>
              <p className="text-white font-medium">{storeConfig.store_name}</p>
            </div>
            {storeConfig.email && (
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <p className="text-gray-400 text-sm mb-1 flex items-center gap-1">
                  <Mail className="w-4 h-4" /> Email
                </p>
                <p className="text-white font-medium">{storeConfig.email}</p>
              </div>
            )}
            {storeConfig.phone && (
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <p className="text-gray-400 text-sm mb-1 flex items-center gap-1">
                  <Phone className="w-4 h-4" /> Phone
                </p>
                <p className="text-white font-medium">{storeConfig.phone}</p>
              </div>
            )}
            {storeConfig.subscription_plan && (
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Subscription</p>
                <p className="text-white font-medium">{storeConfig.subscription_plan}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        }}
        className="grid md:grid-cols-2 gap-4"
      >
        <button
          onClick={() => router.push('/dashboard/upload')}
          className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-[#642FD7] transition-colors text-left"
        >
          <Upload className="w-6 h-6 text-[#642FD7] mb-2" />
          <h3 className="font-bold text-white">Upload Product</h3>
          <p className="text-sm text-gray-400">Add a new item to your inventory</p>
        </button>
        <button
          onClick={() => router.push('/dashboard/analytics')}
          className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-[#642FD7] transition-colors text-left"
        >
          <TrendingUp className="w-6 h-6 text-[#642FD7] mb-2" />
          <h3 className="font-bold text-white">View Analytics</h3>
          <p className="text-sm text-gray-400">Check try-on performance</p>
        </button>
      </motion.div>
    </motion.div>
  );
}
