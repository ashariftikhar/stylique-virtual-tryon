'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, MousePointerClick, RefreshCw, Sparkles, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { AlertBanner, Badge, Button, Card, EmptyState, MetricCard, PageHeader, Skeleton } from '@/components/ui';
import { apiClient } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { TryonAnalytics } from '@/types/api';

const fade = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const ranges = [
  { value: '7d', label: '7 Days', days: 7 },
  { value: '30d', label: '30 Days', days: 30 },
  { value: '90d', label: '90 Days', days: 90 },
  { value: 'all', label: 'All Time', days: null },
];

function csvCell(value: string | number | boolean | null | undefined) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

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
        setError('Not authenticated. Please sign in again.');
        return;
      }

      const selectedRange = ranges.find((range) => range.value === timeRange);
      let fromDate: string | undefined;
      if (selectedRange?.days) {
        const now = new Date();
        const past = new Date(now.getTime() - selectedRange.days * 24 * 60 * 60 * 1000);
        fromDate = past.toISOString();
      }

      try {
        const data: any = await apiClient.getAnalytics(sessionData.store.id, 100, fromDate);
        setAnalytics(data.analytics || []);
      } catch {
        setAnalytics([]);
        setError('Analytics data could not be loaded.');
      }
    } catch {
      setError('Failed to load analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const stats = useMemo(() => {
    const uniqueProducts = new Set(analytics.map((entry) => entry.product_id).filter(Boolean)).size;
    const converted = analytics.filter((entry) => entry.redirect_status).length;
    const conversionRate = analytics.length ? Math.round((converted / analytics.length) * 100) : 0;
    const typeCounts = analytics.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.tryon_type || 'Unknown'] = (acc[entry.tryon_type || 'Unknown'] || 0) + 1;
      return acc;
    }, {});
    const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'No data';
    return { uniqueProducts, converted, conversionRate, topType };
  }, [analytics]);

  const chartData = useMemo(() => {
    const buckets = new Map<string, number>();
    analytics.forEach((entry) => {
      const key = new Date(entry.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      buckets.set(key, (buckets.get(key) || 0) + 1);
    });
    const entries = Array.from(buckets.entries()).slice(-12);
    const max = Math.max(...entries.map(([, value]) => value), 1);
    return entries.map(([label, value]) => ({ label, value, height: Math.max(12, (value / max) * 100) }));
  }, [analytics]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const headers = ['Date', 'Product ID', 'User ID', 'Try-on Type', 'Redirected'];
      const csvContent = [
        headers.map(csvCell).join(','),
        ...analytics.map((entry) =>
          [
            formatDate(entry.created_at),
            entry.product_id || '',
            entry.user_id || '',
            entry.tryon_type,
            entry.redirect_status ? 'Yes' : 'No',
          ]
            .map(csvCell)
            .join(','),
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24" />
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
    >
      <motion.div variants={fade}>
        <PageHeader
          eyebrow="Performance Studio"
          title="Analytics Dashboard"
          description="Track try-on behavior, top interaction modes, and the quality of product engagement over time."
          action={
            <>
              <Button variant="secondary" onClick={loadAnalytics}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={handleExport} disabled={analytics.length === 0} isLoading={isExporting}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </>
          }
        />
      </motion.div>

      <motion.div variants={fade} className="flex flex-wrap gap-2">
        {ranges.map((range) => (
          <Button
            key={range.value}
            variant={timeRange === range.value ? 'primary' : 'secondary'}
            onClick={() => setTimeRange(range.value)}
          >
            {range.label}
          </Button>
        ))}
      </motion.div>

      {error && (
        <motion.div variants={fade}>
          <AlertBanner tone="danger" title="Analytics issue">
            {error}
          </AlertBanner>
        </motion.div>
      )}

      {analytics.length === 0 ? (
        <motion.div variants={fade}>
          <EmptyState
            icon={BarChart3}
            title="No analytics data yet"
            description="Try-on events will appear here after customers begin using the Stylique widget."
          />
        </motion.div>
      ) : (
        <>
          <motion.div variants={fade} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total try-ons" value={analytics.length} detail="Events in selected range" icon={Sparkles} accent="teal" />
            <MetricCard label="Unique products" value={stats.uniqueProducts} detail="Products tried by shoppers" icon={BarChart3} />
            <MetricCard label="Redirect rate" value={`${stats.conversionRate}%`} detail={`${stats.converted} converted events`} icon={TrendingUp} accent="emerald" />
            <MetricCard label="Top mode" value={stats.topType} detail="Most used try-on type" icon={MousePointerClick} accent="rose" />
          </motion.div>

          <motion.div variants={fade}>
            <Card>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Badge variant="teal">Volume Trend</Badge>
                  <h2 className="mt-3 text-xl font-black text-[#161616]">Try-on activity</h2>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7b8783]">Last {chartData.length} active days</p>
              </div>
              <div className="mt-8 flex h-64 items-end gap-3 border-b border-[#161616]/10 pb-4">
                {chartData.map((bar) => (
                  <div key={bar.label} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-3">
                    <div className="relative flex flex-1 items-end">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-[#0f9f91] to-[#d9ebe6]"
                        style={{ height: `${bar.height}%` }}
                        title={`${bar.value} try-ons`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-[#161616]">{bar.value}</p>
                      <p className="truncate text-[10px] text-[#7b8783]">{bar.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          <motion.div variants={fade}>
            <Card className="overflow-hidden p-0">
              <div className="border-b border-[#161616]/10 p-5">
                <Badge variant="primary">Event Ledger</Badge>
                <h2 className="mt-3 text-xl font-black text-[#161616]">Recent try-on events</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px]">
                  <thead className="bg-[#f5f8f6]">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-[#7b8783]">Date</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-[#7b8783]">Product</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-[#7b8783]">Type</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-[#7b8783]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#161616]/10">
                    {analytics.slice(0, 50).map((entry) => (
                      <tr key={entry.id} className="transition hover:bg-[#f5f8f6]">
                        <td className="px-5 py-4 text-sm text-[#4f5d58]">{formatDate(entry.created_at)}</td>
                        <td className="px-5 py-4 text-xs font-mono text-[#66736f]">{entry.product_id || 'Not linked'}</td>
                        <td className="px-5 py-4">
                          <Badge variant="default">{entry.tryon_type || 'Unknown'}</Badge>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant={entry.redirect_status ? 'success' : 'muted'}>
                            {entry.redirect_status ? 'Converted' : 'Viewed'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
