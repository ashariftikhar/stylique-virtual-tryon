'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Users, Eye, Download, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/api';
import { TryonAnalytics } from '@/types/api';

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<TryonAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('7d');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setIsLoading(true);
        // Get store session
        const sessionResponse = await fetch('/api/get-store-session');
        const sessionData = await sessionResponse.json();

        if (!sessionData.authenticated || !sessionData.store?.id) {
          setError('Not authenticated');
          return;
        }

        // Fetch analytics from backend
        try {
          const data = await apiClient.getAnalytics(sessionData.store.id, 100);
          setAnalytics(data.analytics || []);
        } catch (apiError) {
          console.warn('Backend analytics endpoint not yet available');
          setAnalytics([]);
        }
      } catch (err) {
        console.error('Error loading analytics:', err);
        setError('Failed to load analytics');
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, [timeRange]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Create CSV content
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

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
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
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.1 },
        },
      }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
          <p className="text-gray-400">Track your virtual try-on performance</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg border border-gray-800 text-gray-300 hover:border-gray-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || analytics.length === 0}
            className="px-4 py-2 rounded-lg bg-[#642FD7] text-white hover:bg-[#542FCF] disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Time Range Filter */}
      <div className="flex gap-2">
        {['7d', '30d', '90d', 'all'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === range
                ? 'bg-[#642FD7] text-white'
                : 'bg-gray-900/50 text-gray-300 border border-gray-800 hover:border-gray-700'
            }`}
          >
            {range === '7d' && 'Last 7 Days'}
            {range === '30d' && 'Last 30 Days'}
            {range === '90d' && 'Last 90 Days'}
            {range === 'all' && 'All Time'}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-900/50 text-red-300">
          {error}
        </div>
      )}

      {analytics.length === 0 ? (
        <div className="p-8 rounded-2xl bg-gray-900/50 border border-gray-800 text-center">
          <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No analytics data yet</p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-gray-900/50 border border-gray-800 p-6">
              <p className="text-gray-400 text-sm mb-2">Total Try-ons</p>
              <p className="text-white text-3xl font-bold">{analytics.length}</p>
            </div>
            <div className="rounded-2xl bg-gray-900/50 border border-gray-800 p-6">
              <p className="text-gray-400 text-sm mb-2">Unique Products</p>
              <p className="text-white text-3xl font-bold">
                {new Set(analytics.map((a) => a.product_id)).size}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-900/50 border border-gray-800 p-6">
              <p className="text-gray-400 text-sm mb-2">Conversion Rate</p>
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
          </div>

          {/* Analytics Table */}
          <div className="rounded-2xl bg-gray-900/50 border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-800 bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400">
                      Try-on Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {analytics.slice(0, 50).map((entry, idx) => (
                    <tr key={idx} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        <span className="px-2 py-1 rounded-full bg-[#642FD7]/20 text-[#B4A5E0] text-xs">
                          {entry.tryon_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            entry.redirect_status
                              ? 'bg-green-900/20 text-green-300'
                              : 'bg-gray-900/50 text-gray-400'
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
          </div>
        </>
      )}
    </motion.div>
  );
}
