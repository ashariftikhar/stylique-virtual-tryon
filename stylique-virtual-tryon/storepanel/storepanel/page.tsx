'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import { useStorePanel } from '@/contexts/StorePanelContext';
import { Package, Upload, TrendingUp, ArrowUpRight, Store, Mail, Phone, MapPin, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StorePanelHome() {
  const { store } = useStorePanel();
  const [inventoryCount, setInventoryCount] = useState(0);
  const [tryonCount, setTryonCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      try {
        if (store?.id) {
          // Get basic stats
          const { count: inventory } = await supabase
            .from('inventory')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', store.id);

          const { count: tryon } = await supabase
            .from('tryon_analytics')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', store.id);

          setInventoryCount(inventory || 0);
          setTryonCount(tryon || 0);
        }
      } catch (error) {
        console.error('Error loading store data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (store) {
      loadData();
    }
  }, [store]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#642FD7] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="text-center">
        <p className="text-red-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>Failed to load store data. Please try again.</p>
      </div>
    );
  }

  const storeName = store?.store_name?.split(' ')[0] || 'Store';

  return (
    <motion.div 
      className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 relative px-4 sm:px-6 lg:px-0 w-full overflow-x-hidden" 
      style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
          }
        }
      }}
    >
      {/* Left Content */}
      <motion.div 
        className="flex-1 space-y-4 sm:space-y-6 lg:space-y-8 min-w-0 pt-4 xl:pt-8 w-full max-w-full"
        variants={{
          hidden: { opacity: 0, x: -30 },
          visible: {
            opacity: 1,
            x: 0,
            transition: { duration: 0.6, ease: "easeOut" }
          }
        }}
      >
        {/* Welcome Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="max-w-4xl">
            <h1 
              className="text-4xl lg:text-6xl text-white mb-4"
              style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
            >
              Welcome back, {storeName}!
            </h1>
            <p 
              className="text-xs lg:text-sm text-gray-500 max-w-2xl leading-relaxed"
              style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
            >
              Manage your inventory and track customer engagement with virtual try-ons
            </p>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6"
        >
          {/* First card: gradient background */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full sm:w-fit"
          >
            <div 
              className="rounded-3xl px-6 py-4 bg-gradient-to-r from-[#642FD7] to-[#F4536F] w-full sm:w-fit h-20 flex items-center justify-center sm:justify-start"
              style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl lg:text-3xl text-white whitespace-nowrap px-3" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                  {inventoryCount}
                </div>
                <div 
                  className="text-2xl lg:text-3xl text-white whitespace-nowrap px-3"
                  style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                >
                  Products
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Second card: white outline with separate badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto"
          >
            <div 
              className="rounded-3xl px-6 py-4 border-2 border-white w-full sm:w-fit h-20 flex items-center justify-center sm:justify-start"
              style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
            >
              <div 
                className="text-2xl lg:text-3xl text-white whitespace-nowrap px-2"
                style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
              >
                Try-Ons
              </div>
            </div>
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#642FD7] to-[#F4536F] flex items-center justify-center flex-shrink-0">
              <div className="text-white text-2xl lg:text-3xl px-4 py-3" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                {tryonCount}
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Store Information - Mobile Only */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="xl:hidden"
        >
          <div className="bg-[#2a2a2a] rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#642FD7] to-[#F4536F] flex items-center justify-center">
                <Store className="w-4 h-4 text-white" />
              </div>
              <h3 
                className="text-lg text-white"
                style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
              >
                Store Information
              </h3>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <Store className="w-4 h-4 text-gray-400" />
                  <label 
                    className="text-xs text-gray-400"
                    style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                  >
                    Store Name
                  </label>
                </div>
                <div 
                  className="text-sm text-white mt-1"
                  style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                >
                  {store?.store_name || '—'}
                </div>
              </div>

              <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <label 
                    className="text-xs text-gray-400"
                    style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                  >
                    Store ID
                  </label>
                </div>
                <div 
                  className="text-sm text-white font-mono mt-1"
                  style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                >
                  {store?.store_id || '—'}
                </div>
              </div>

              {store?.email && (
                <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-700">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <label 
                      className="text-xs text-gray-400"
                      style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                    >
                      Email
                    </label>
                  </div>
                  <div 
                    className="text-sm text-white mt-1"
                    style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                  >
                    {store.email}
                  </div>
                </div>
              )}

              {store?.phone && (
                <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-700">
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <label 
                      className="text-xs text-gray-400"
                      style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                    >
                      Phone
                    </label>
                  </div>
                  <div 
                    className="text-sm text-white mt-1"
                    style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                  >
                    {store.phone}
                  </div>
                </div>
              )}

              {store?.address && (
                <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-700">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <label 
                      className="text-xs text-gray-400"
                      style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                    >
                      Address
                    </label>
                  </div>
                  <div 
                    className="text-sm text-white mt-1"
                    style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                  >
                    {store.address}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <h2 
              className="text-3xl lg:text-4xl text-white"
              style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
            >
              Shortcuts
            </h2>
            <ArrowUpRight className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:flex-1"
            >
              <div 
                className="group rounded-2xl p-5 bg-[#642FD7] cursor-pointer overflow-hidden relative flex flex-col w-full"
                onClick={() => router.push('/storepanel/upload')}
                style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
              >
                <div className="relative z-10 flex flex-col h-full">
                  <h3 className="text-xl lg:text-2xl text-white mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                    Upload Item
                  </h3>
                  <p 
                    className="text-sm text-gray-300 mb-4"
                    style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                  >
                    Add clothing items to your inventory
                  </p>
                  <div className="relative flex items-end justify-between">
                    <button 
                      className="px-4 py-1.5 border-2 border-white rounded-lg text-white text-xs transition-colors"
                      style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/storepanel/upload');
                      }}
                    >
                      GET STARTED
                    </button>
                    <div className="w-8 h-8 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:flex-1"
            >
              <div 
                className="group rounded-2xl p-5 bg-[#642FD7] cursor-pointer overflow-hidden relative flex flex-col w-full"
                onClick={() => router.push('/storepanel/analytics')}
                style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
              >
                <div className="relative z-10 flex flex-col h-full">
                  <h3 className="text-xl lg:text-2xl text-white mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                    Analytics
                  </h3>
                  <p 
                    className="text-sm text-gray-300 mb-4"
                    style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                  >
                    Track try-on performance
                  </p>
                  <div className="relative flex items-end justify-between">
                    <button 
                      className="px-4 py-1.5 border-2 border-white rounded-lg text-white text-xs transition-colors"
                      style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/storepanel/analytics');
                      }}
                    >
                      GET STARTED
                    </button>
                    <div className="w-8 h-8 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:flex-1"
            >
              <div 
                className="group rounded-2xl p-5 bg-[#642FD7] cursor-pointer overflow-hidden relative flex flex-col w-full"
                onClick={() => router.push('/storepanel/manage')}
                style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
              >
                <div className="relative z-10 flex flex-col h-full">
                  <h3 className="text-xl lg:text-2xl text-white mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                    Manage Items
                  </h3>
                  <p 
                    className="text-sm text-gray-300 mb-4"
                    style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                  >
                    Edit and organize inventory
                  </p>
                  <div className="relative flex items-end justify-between">
                    <button 
                      className="px-4 py-1.5 border-2 border-white rounded-lg text-white text-xs transition-colors"
                      style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/storepanel/manage');
                      }}
                    >
                      GET STARTED
                    </button>
                    <div className="w-8 h-8 flex items-center justify-center">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* Right Side - Store Information (Desktop Only) */}
      <motion.div 
        className="hidden xl:block w-72 flex-shrink-0"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
      >
        <div className="xl:sticky xl:top-8">
          <div className="bg-[#2a2a2a] rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#642FD7] to-[#F4536F] flex items-center justify-center">
                <Store className="w-4 h-4 text-white" />
              </div>
              <h3 
                className="text-lg text-white"
                style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
              >
                Store Information
              </h3>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <Store className="w-4 h-4 text-gray-400" />
                  <label 
                    className="text-xs text-gray-400"
                    style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                  >
                    Store Name
                  </label>
                </div>
                <div 
                  className="text-sm text-white mt-1"
                  style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                >
                  {store?.store_name || '—'}
                </div>
              </div>

              <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <label 
                    className="text-xs text-gray-400"
                    style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                  >
                    Store ID
                  </label>
                </div>
                <div 
                  className="text-sm text-white font-mono mt-1"
                  style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                >
                  {store?.store_id || '—'}
                </div>
              </div>

              {store?.email && (
                <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-700">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <label 
                      className="text-xs text-gray-400"
                      style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                    >
                      Email
                    </label>
                  </div>
                  <div 
                    className="text-sm text-white mt-1"
                    style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                  >
                    {store.email}
                  </div>
                </div>
              )}

              {store?.phone && (
                <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-700">
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <label 
                      className="text-xs text-gray-400"
                      style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                    >
                      Phone
                    </label>
                  </div>
                  <div 
                    className="text-sm text-white mt-1"
                    style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                  >
                    {store.phone}
                  </div>
                </div>
              )}

              {store?.address && (
                <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-700">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <label 
                      className="text-xs text-gray-400"
                      style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                    >
                      Address
                    </label>
                  </div>
                  <div 
                    className="text-sm text-white mt-1"
                    style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                  >
                    {store.address}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
} 