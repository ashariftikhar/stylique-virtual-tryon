'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Loader2, RefreshCw, Download } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface Conversion {
  id: string;
  store_id: string;
  user_id?: string;
  product_id?: string;
  add_to_cart: boolean;
  status: string;
  created_at: string;
}

const fade = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export default function Conversions() {
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadConversions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      const sessionRes = await fetch('/api/get-store-session');
      const session = await sessionRes.json();

      if (!session.authenticated || !session.store?.id) {
        setError('Not authenticated');
        return;
      }

      try {
        const data: any = await apiClient.getConversions(session.store.id);
        setConversions(data.conversions || []);
      } catch {
        setConversions([]);
      }
    } catch (err: any) {
      console.error('Error loading conversions:', err);
      setError('Failed to load conversion data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversions();
  }, [loadConversions]);

  const handleExport = () => {
    const headers = ['Date', 'Product ID', 'User ID', 'Add to Cart', 'Status'];
    const csvContent = [
      headers.join(','),
      ...conversions.map((c) =>
        [
          new Date(c.created_at).toLocaleDateString(),
          c.product_id || '—',
          c.user_id || '—',
          c.add_to_cart ? 'Yes' : 'No',
          c.status,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const addToCartCount = conversions.filter((c) => c.add_to_cart).length;
  const conversionRate =
    conversions.length > 0 ? Math.round((addToCartCount / conversions.length) * 100) : 0;

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
    >
      <motion.div
        variants={fade}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Conversion Analytics</h1>
          <p className="text-gray-400 text-sm">Track customer conversions from try-ons</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadConversions}
            className="px-4 py-2 rounded-lg border border-gray-800 text-gray-300 hover:border-gray-700 transition-colors flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={conversions.length === 0}
            className="px-4 py-2 rounded-lg bg-[#642FD7] text-white hover:bg-[#542FCF] disabled:opacity-50 transition-colors flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#642FD7]" />
            <p className="text-white">Loading conversion data...</p>
          </div>
        </div>
      ) : error ? (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-900/50 text-red-300 text-sm">
          {error}
        </div>
      ) : conversions.length === 0 ? (
        <motion.div
          variants={fade}
          className="p-12 rounded-2xl bg-gray-900/30 border border-gray-800/60 text-center"
        >
          <TrendingUp className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400">No conversion data yet</p>
          <p className="text-xs text-gray-500 mt-2">
            Conversions appear once customers interact with try-ons
          </p>
        </motion.div>
      ) : (
        <>
          <motion.div variants={fade} className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-gray-900/40 border border-gray-800/60 p-5">
              <p className="text-gray-400 text-xs mb-1">Total Conversions</p>
              <p className="text-white text-3xl font-bold">{conversions.length}</p>
            </div>
            <div className="rounded-2xl bg-gray-900/40 border border-gray-800/60 p-5">
              <p className="text-gray-400 text-xs mb-1">Add to Cart</p>
              <p className="text-white text-3xl font-bold">{addToCartCount}</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-r from-[#642FD7] to-[#F4536F] p-5">
              <p className="text-white/70 text-xs mb-1">Conversion Rate</p>
              <p className="text-white text-3xl font-bold">{conversionRate}%</p>
            </div>
          </motion.div>

          <motion.div
            variants={fade}
            className="rounded-2xl bg-gray-900/40 border border-gray-800/60 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-800 bg-gray-800/30">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Product</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Add to Cart</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {conversions.slice(0, 50).map((c) => (
                    <tr key={c.id} className="hover:bg-gray-800/20 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-gray-300">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-400 font-mono text-xs">
                        {c.product_id ? c.product_id.slice(0, 8) + '...' : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-sm">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            c.add_to_cart
                              ? 'bg-emerald-900/30 text-emerald-300'
                              : 'bg-gray-800/50 text-gray-500'
                          }`}
                        >
                          {c.add_to_cart ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-400">{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
