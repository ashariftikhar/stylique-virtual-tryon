'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Download, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/api';
import { TryonAnalytics } from '@/types/api';

const fade = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<TryonAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('7d');
  const [isExporting, setIsExporting] = useState(false);

  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      const sessionResponse = await fetch('/api/get-store-session');
      const sessionData = await sessionResponse.json();

      if (!sessionData.authenticated || !sessionData.store?.id) {
        setError('Not authenticated');
        return;
      }

      let fromDate: string | undefined;
      if (timeRange !== 'all') {
        const now = new Date();
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        fromDate = past.toISOString();
      }

      try {
        const data: any = await apiClient.getAnalytics(sessionData.store.id, 100, fromDate);
        setAnalytics(data.analytics || []);
      } catch {
        setAnalytics([]);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const headers = ['Date', 'Product ID', 'User ID', 'Try-on Type', 'Redirected'];
      const csvContent = [
        headers.join(','),
        ...analytics.map((a) =>
          [
            new Date(a.created_at).toLocaleDateString(),
            a.product_id || '—',
            a.user_id || '—',
            a.tryon_type,
            a.redirect_status ? 'Yes' : 'No',
          ].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#642FD7]" />
          <p className="text-white">Loading analytics...</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-white mb-1">Analytics Dashboard</h1>
          <p className="text-gray-400 text-sm">Track your virtual try-on performance</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 rounded-lg border border-gray-800 text-gray-300 hover:border-gray-700 transition-colors flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || analytics.length === 0}
            className="px-4 py-2 rounded-lg bg-[#642FD7] text-white hover:bg-[#542FCF] disabled:opacity-50 transition-colors flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </motion.div>

      {/* Time range */}
      <motion.div variants={fade} className="flex gap-2">
        {['7d', '30d', '90d', 'all'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === range
                ? 'bg-[#642FD7] text-white'
                : 'bg-gray-900/50 text-gray-400 border border-gray-800 hover:border-gray-700'
            }`}
          >
            {range === '7d' && 'Last 7 Days'}
            {range === '30d' && 'Last 30 Days'}
            {range === '90d' && 'Last 90 Days'}
            {range === 'all' && 'All Time'}
          </button>
        ))}
      </motion.div>

      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-900/50 text-red-300 text-sm">
          {error}
        </div>
      )}

      {analytics.length === 0 ? (
        <motion.div
          variants={fade}
          className="p-12 rounded-2xl bg-gray-900/30 border border-gray-800/60 text-center"
        >
          <BarChart3 className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400">No analytics data yet</p>
        </motion.div>
      ) : (
        <>
          <motion.div variants={fade} className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-gray-900/40 border border-gray-800/60 p-5">
              <p className="text-gray-400 text-xs mb-1">Total Try-ons</p>
              <p className="text-white text-3xl font-bold">{analytics.length}</p>
            </div>
            <div className="rounded-2xl bg-gray-900/40 border border-gray-800/60 p-5">
              <p className="text-gray-400 text-xs mb-1">Unique Products</p>
              <p className="text-white text-3xl font-bold">
                {new Set(analytics.map((a) => a.product_id)).size}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-900/40 border border-gray-800/60 p-5">
              <p className="text-gray-400 text-xs mb-1">Conversion Rate</p>
              <p className="text-white text-3xl font-bold">
                {analytics.length > 0
                  ? `${Math.round(
                      (analytics.filter((a) => a.redirect_status).length /
                        analytics.length) *
                        100
                    )}%`
                  : '—'}
              </p>
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
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Try-on Type</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {analytics.slice(0, 50).map((entry, idx) => (
                    <tr key={idx} className="hover:bg-gray-800/20 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-gray-300">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-sm">
                        <span className="px-2 py-0.5 rounded-full bg-[#642FD7]/15 text-[#B4A5E0] text-[11px] font-medium">
                          {entry.tryon_type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            entry.redirect_status
                              ? 'bg-emerald-900/30 text-emerald-300'
                              : 'bg-gray-800/50 text-gray-500'
                          }`}
                        >
                          {entry.redirect_status ? 'Converted' : 'Viewed'}
                        </span>
                      </td>
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
