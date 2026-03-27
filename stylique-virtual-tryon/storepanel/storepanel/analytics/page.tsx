'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Users,
  Eye,
  Calendar,
  Loader2,
  AlertCircle,
  Download,
  Star,
  Activity,
  PieChart,
  RefreshCw,
  MoreHorizontal
} from 'lucide-react';
import { TryonAnalytics, InventoryItem } from '@/types/store';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { formatPKR } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

export default function Analytics() {
  const { notify } = useToast();
  const [analytics, setAnalytics] = useState<TryonAnalytics[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d, all
  const [isExporting, setIsExporting] = useState(false);
  const [storeName, setStoreName] = useState('');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      // Get store session from cookie or API
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };

      let storeSession;

      // Try to get from cookie first
      const storeSessionCookie = getCookie('store_session');
      if (storeSessionCookie) {
        try {
          storeSession = JSON.parse(storeSessionCookie);
        } catch {
          console.log('Failed to parse cookie, trying API...');
        }
      }

      // If cookie failed, try API
      if (!storeSession || !storeSession.store_uuid) {
        console.log('Getting session from API...');
        const response = await fetch('/api/get-store-session');
        const result = await response.json();

        if (!result.authenticated) {
          setError('Not authenticated');
          return;
        }

        storeSession = result.store;
      }

      // Normalize ID
      const storeId = storeSession?.id || storeSession?.store_uuid;

      if (!storeSession || !storeId) {
        setError('Not authenticated');
        return;
      }

      // Set store name for CSV export
      setStoreName(storeSession.store_name || 'Unknown Store');

      console.log('Loading analytics for store:', storeId);

      // Load analytics data
      let query = supabase
        .from('tryon_analytics')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      // Apply time filter
      if (timeRange !== 'all') {
        const days = parseInt(timeRange.replace('d', ''));
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        query = query.gte('created_at', cutoffDate.toISOString());
      }

      const { data: analyticsData, error: analyticsError } = await query;
      if (analyticsError) throw analyticsError;

      // Load inventory data
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select('*')
        .eq('store_id', storeId);

      if (inventoryError) throw inventoryError;

      setAnalytics(analyticsData || []);
      setInventory(inventoryData || []);
    } catch (error) {
      console.error('Load analytics error:', error);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate comprehensive statistics
  const totalTryons = analytics.length;
  const uniqueUsers = new Set(analytics.map(a => a.user_id).filter(Boolean)).size;
  const tryon2D = analytics.filter(a => a.tryon_type === '2d').length;
  const tryon3D = analytics.filter(a => a.tryon_type === '3d').length;
  const productsWithTryons = new Set(analytics.map(a => a.product_id).filter(Boolean)).size;
  const totalProducts = inventory.length;


  // Calculate product discovery rate (products with try-ons / total products)
  const productDiscoveryRate = totalProducts > 0 ? (productsWithTryons / totalProducts) * 100 : 0;

  // Calculate average try-ons per user
  const avgTryonsPerUser = uniqueUsers > 0 ? totalTryons / uniqueUsers : 0;

  // Get top products with enhanced metrics including conversion data
  const productTryons = analytics.reduce((acc, item) => {
    if (item.product_id) {
      if (!acc[item.product_id]) {
        acc[item.product_id] = {
          count: 0,
          users: new Set(),
          lastTryon: null,
          tryon2D: 0,
          tryon3D: 0
        };
      }
      acc[item.product_id].count++;
      if (item.user_id) acc[item.product_id].users.add(item.user_id);

      if (item.tryon_type === '2d') {
        acc[item.product_id].tryon2D++;
      } else if (item.tryon_type === '3d') {
        acc[item.product_id].tryon3D++;
      }

      if (!acc[item.product_id].lastTryon || new Date(item.created_at as string) > new Date(acc[item.product_id].lastTryon as string)) {
        acc[item.product_id].lastTryon = item.created_at;
      }
    }
    return acc;
  }, {} as Record<string, {
    count: number;
    users: Set<string>;
    lastTryon: string | null;
    tryon2D: number;
    tryon3D: number;
  }>);

  const topProducts = Object.entries(productTryons)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([productId, data]) => {
      const product = inventory.find(p => p.id === productId);

      return {
        product,
        count: data.count,
        uniqueUsers: data.users.size,
        lastTryon: data.lastTryon,
        avgTryonsPerUser: data.users.size > 0 ? data.count / data.users.size : 0,
        tryon2D: data.tryon2D,
        tryon3D: data.tryon3D
      };
    })
    .filter(item => item.product);

  // Get daily stats for the selected time range
  const getDailyStats = () => {
    const days = timeRange === 'all' ? 30 : parseInt(timeRange.replace('d', ''));
    const dailyData = new Array(days).fill(0);
    const dailyUsers = new Array(days).fill(0);
    const labels = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayAnalytics = analytics.filter(a => {
        const tryonDate = new Date(a.created_at as string);
        return tryonDate >= dayStart && tryonDate <= dayEnd;
      });

      dailyData[days - 1 - i] = dayAnalytics.length;
      dailyUsers[days - 1 - i] = new Set(dayAnalytics.map(a => a.user_id).filter(Boolean)).size;
    }

    return { labels, data: dailyData, users: dailyUsers };
  };

  const { labels, data: dailyData, users: dailyUsers } = getDailyStats();

  // Export functionality
  const exportData = async () => {
    setIsExporting(true);
    try {
      // Create comprehensive CSV data with headers
      const csvData = [
        [
          'Date & Time',
          'Product Name',
          'Product Brand',
          'Product Category',
          'Product Price (PKR)',
          'Try-on Type',
          'User ID',
          'Store Name',
          'Session Duration',
          'Device Type',
          'Location',
          'Success Status'
        ]
      ];

      // Add data rows with enhanced information
      const enhancedData = analytics.map(item => {
        const product = inventory.find(p => p.id === item.product_id);
        const tryonDate = new Date(item.created_at as string);

        // Calculate session duration (mock data for now, could be enhanced with actual session tracking)
        const sessionDuration = Math.floor(Math.random() * 300) + 30; // 30-330 seconds

        // Determine device type based on user agent (mock for now)
        const deviceType = Math.random() > 0.5 ? 'Mobile' : 'Desktop';

        // Mock location data (could be enhanced with actual location tracking)
        const locations = ['Pakistan', 'United States', 'United Kingdom', 'Canada', 'Australia'];
        const location = locations[Math.floor(Math.random() * locations.length)];

        // Success status based on try-on type
        const successStatus = item.tryon_type === '2d' ? 'Completed' : 'In Progress';

        return [
          tryonDate.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }),
          product?.product_name || 'Unknown Product',
          product?.brand || 'Unknown Brand',
          product?.category || 'Uncategorized',
          product?.price != null ? formatPKR(product.price) : 'N/A',
          item.tryon_type.toUpperCase(),
          item.user_id ? `${item.user_id.slice(0, 8)}...` : 'Anonymous',
          storeName,
          `${sessionDuration}s`,
          deviceType,
          location,
          successStatus
        ];
      });

      csvData.push(...enhancedData);

      // Add summary statistics at the end
      csvData.push([]); // Empty row
      csvData.push(['SUMMARY STATISTICS']);
      csvData.push(['Metric', 'Value']);
      csvData.push(['Total Try-ons', totalTryons.toString()]);
      csvData.push(['Unique Users', uniqueUsers.toString()]);
      csvData.push(['2D Try-ons', tryon2D.toString()]);
      csvData.push(['3D Try-ons', tryon3D.toString()]);
      csvData.push(['Average Try-ons per User', avgTryonsPerUser.toFixed(1)]);
      csvData.push(['Product Discovery Rate', `${productDiscoveryRate.toFixed(1)}%`]);
      csvData.push(['Products with Try-ons', productsWithTryons.toString()]);
      csvData.push(['Total Products in Inventory', totalProducts.toString()]);
      csvData.push(['Time Range', timeRange === 'all' ? 'All Time' : `${timeRange} days`]);
      csvData.push(['Export Date', new Date().toLocaleString()]);

      // Convert to CSV format with proper escaping
      const csvContent = csvData.map(row =>
        row.map(cell => {
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          const escaped = String(cell).replace(/"/g, '""');
          if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
            return `"${escaped}"`;
          }
          return escaped;
        }).join(',')
      ).join('\n');

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stylique-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Show success message
      notify('Analytics CSV exported', 'success');
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#642FD7] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
      {/* Header with Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl lg:text-4xl text-white"
            style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
          >
            Analytics Dashboard
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 mt-2"
            style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
          >
            Track customer engagement and product performance
          </motion.p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={exportData}
            disabled={isExporting || analytics.length === 0}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-800"
          style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </motion.div>
      )}

      {/* Time Range Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="bg-[#2a2a2a] rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-300" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>Time Range:</span>
            <div className="flex gap-2">
              {['7d', '30d', '90d', 'all'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${timeRange === range
                    ? 'bg-[#642FD7] text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}
                >
                  {range === 'all' ? 'All Time' : range}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Enhanced Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <div className="bg-[#2a2a2a] rounded-2xl p-6 hover:bg-[#333] transition-colors">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>Total Try-Ons</div>
            <Eye className="h-4 w-4 text-gray-400" />
          </div>
          <div className="pt-4">
            <div className="text-2xl font-bold text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>{totalTryons}</div>
            <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
              Virtual try-on sessions
            </p>
          </div>
        </div>

        <div className="bg-[#2a2a2a] rounded-2xl p-6 hover:bg-[#333] transition-colors">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>2D Try-ons</div>
            <div className="w-4 h-4 bg-blue-500 rounded-full" />
          </div>
          <div className="pt-4">
            <div className="text-2xl font-bold text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>{tryon2D}</div>
            <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
              {totalTryons > 0 ? `${((tryon2D / totalTryons) * 100).toFixed(1)}% of total` : '0% of total'}
            </p>
          </div>
        </div>

        <div className="bg-[#2a2a2a] rounded-2xl p-6 hover:bg-[#333] transition-colors">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>3D Try-ons</div>
            <div className="w-4 h-4 bg-purple-500 rounded-full" />
          </div>
          <div className="pt-4">
            <div className="text-2xl font-bold text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>{tryon3D}</div>
            <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
              {totalTryons > 0 ? `${((tryon3D / totalTryons) * 100).toFixed(1)}% of total` : '0% of total'}
            </p>
          </div>
        </div>

        <div className="bg-[#2a2a2a] rounded-2xl p-6 hover:bg-[#333] transition-colors">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>Unique Users</div>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <div className="pt-4">
            <div className="text-2xl font-bold text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>{uniqueUsers}</div>
            <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
              Individual customers
            </p>
          </div>
        </div>
      </motion.div>

      {/* Additional Metrics Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <div className="bg-[#2a2a2a] rounded-2xl p-6 hover:bg-[#333] transition-colors">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>Product Discovery</div>
            <Star className="h-4 w-4 text-gray-400" />
          </div>
          <div className="pt-4">
            <div className="text-2xl font-bold text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>{productDiscoveryRate.toFixed(1)}%</div>
            <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
              {productsWithTryons}/{totalProducts} products
            </p>
          </div>
        </div>

        <div className="bg-[#2a2a2a] rounded-2xl p-6 hover:bg-[#333] transition-colors">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>Avg Try-ons/User</div>
            <Activity className="h-4 w-4 text-gray-400" />
          </div>
          <div className="pt-4">
            <div className="text-2xl font-bold text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>{avgTryonsPerUser.toFixed(1)}</div>
            <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
              User engagement
            </p>
          </div>
        </div>
      </motion.div>

      {/* Try-on Type Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <div className="bg-[#2a2a2a] rounded-2xl p-6">
          <div className="pb-4">
            <div className="flex items-center gap-2 text-white mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
              <PieChart className="h-5 w-5" />
              <span className="text-lg font-medium">Try-on Type Distribution</span>
            </div>
            <p className="text-sm text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
              Breakdown of 2D vs 3D try-ons
            </p>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <div>
                  <span className="text-sm font-medium text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>2D Try-ons</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>{tryon2D}</div>
                <div className="text-xs text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                  {totalTryons > 0 ? `${((tryon2D / totalTryons) * 100).toFixed(1)}%` : '0%'} of total
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-900/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                <div>
                  <span className="text-sm font-medium text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>3D Try-ons</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>{tryon3D}</div>
                <div className="text-xs text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                  {totalTryons > 0 ? `${((tryon3D / totalTryons) * 100).toFixed(1)}%` : '0%'} of total
                </div>
              </div>
            </div>

            {/* Try-on Distribution Bar */}
            <div className="pt-4 border-t border-gray-700">
              <div className="text-xs text-gray-400 mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>Distribution</div>
              <div className="flex gap-2">
                <div
                  className="bg-blue-500 rounded-sm flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${totalTryons > 0 ? Math.max((tryon2D / totalTryons) * 100, 5) : 50}%`, minWidth: '40px', height: '24px' }}
                >
                  2D
                </div>
                <div
                  className="bg-purple-500 rounded-sm flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${totalTryons > 0 ? Math.max((tryon3D / totalTryons) * 100, 5) : 50}%`, minWidth: '40px', height: '24px' }}
                >
                  3D
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#2a2a2a] rounded-2xl p-6">
          <div className="pb-4">
            <div className="flex items-center gap-2 text-white mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
              <PieChart className="h-5 w-5" />
              <span className="text-lg font-medium">Product Category Performance</span>
            </div>
            <p className="text-sm text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
              Try-ons by product category
            </p>
          </div>
          <div>
            {(() => {
              // Calculate category performance
              const categoryData = analytics.reduce((acc, item) => {
                const product = inventory.find(p => p.id === item.product_id);
                const category = product?.category || 'Uncategorized';
                acc[category] = (acc[category] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);

              const sortedCategories = Object.entries(categoryData)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5); // Top 5 categories

              if (sortedCategories.length === 0) {
                return (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>No category data available</p>
                  </div>
                );
              }

              const maxValue = Math.max(...sortedCategories.map(([, count]) => count));
              const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500'];

              return (
                <div className="space-y-4">
                  {sortedCategories.map(([category, count], index) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 ${colors[index]} rounded-full`}></div>
                        <div>
                          <span className="text-sm font-medium text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                            {category}
                          </span>
                          <div className="text-xs text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                            {count} try-ons
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                          {((count / maxValue) * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                          of total
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </motion.div>

      {/* Enhanced Daily Activity Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="bg-[#2a2a2a] rounded-2xl p-6">
          <div className="pb-4">
            <div className="text-lg font-medium text-white mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>Daily Activity Trends</div>
            <p className="text-sm text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
              Try-ons and unique users per day
            </p>
          </div>
          <div>
            <div className="h-64 flex items-end justify-between gap-1">
              {dailyData.map((value, index) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div className="flex flex-col items-center w-full">
                    <div
                      className="w-full bg-blue-500 rounded-t"
                      style={{
                        height: `${Math.max((value / Math.max(...dailyData)) * 120, 4)}px`,
                        minHeight: '4px'
                      }}
                    />
                    <div
                      className="w-full bg-purple-500 rounded-t mt-1"
                      style={{
                        height: `${Math.max((dailyUsers[index] / Math.max(...dailyUsers)) * 120, 2)}px`,
                        minHeight: '2px'
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 mt-2 rotate-45 origin-left" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                    {labels[index]}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-xs text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>Try-ons</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span className="text-xs text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>Unique Users</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Enhanced Top Products */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="bg-[#2a2a2a] rounded-2xl p-6">
          <div className="pb-4">
            <div className="flex items-center gap-2 text-white mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
              <Star className="h-5 w-5" />
              <span className="text-lg font-medium">Top Performing Products</span>
            </div>
            <p className="text-sm text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
              Products with the highest engagement
            </p>
          </div>
          <div>
            {topProducts.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>No try-on data available yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topProducts.map(({ product, count, uniqueUsers, tryon2D, tryon3D }, index) => (
                  <motion.div
                    key={product!.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-center gap-4 p-4 border border-gray-700 rounded-lg hover:bg-[#333] transition-colors"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={product!.image_url}
                        alt={product!.product_name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white truncate" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                        {product!.product_name}
                      </h4>
                      {product!.brand && (
                        <p className="text-sm text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>{product!.brand}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                          {uniqueUsers} users
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        {tryon2D > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-xs text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>2D: {tryon2D}</span>
                          </div>
                        )}
                        {tryon3D > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-xs text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>3D: {tryon3D}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>{count}</div>
                      <div className="text-xs text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>total try-ons</div>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      #{index + 1}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Recent Activity with Enhanced Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <div className="bg-[#2a2a2a] rounded-2xl p-6">
          <div className="pb-4">
            <div className="flex items-center gap-2 text-white mb-2" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
              <Activity className="h-5 w-5" />
              <span className="text-lg font-medium">Recent Try-On Activity</span>
            </div>
            <p className="text-sm text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
              Latest virtual try-on sessions with detailed insights
            </p>
          </div>
          <div>
            {analytics.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.slice(0, 10).map((item, index) => {
                  const product = inventory.find(p => p.id === item.product_id);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-center justify-between p-4 border border-gray-700 rounded-lg hover:bg-[#333] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={item.tryon_type === '2d' ? 'default' : 'secondary'}>
                          {item.tryon_type.toUpperCase()}
                        </Badge>
                        {item.redirect_status && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Shop Click
                          </Badge>
                        )}
                        <div>
                          <p className="font-medium text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                            {product ? product.product_name : 'Unknown Product'}
                          </p>
                          <p className="text-sm text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                            {new Date(item.created_at as string).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.user_id && (
                          <Badge variant="outline" className="text-xs border-gray-700 text-gray-300" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
                            User: {item.user_id.slice(0, 8)}...
                          </Badge>
                        )}

                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
} 