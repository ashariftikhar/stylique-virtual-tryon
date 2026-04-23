'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, ShoppingBag, ShoppingCart, Target, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { AlertBanner, Badge, Button, Card, EmptyState, MetricCard, PageHeader, Skeleton } from '@/components/ui';
import { apiClient } from '@/lib/api';
import { formatDate } from '@/lib/utils';

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

function csvCell(value: string | number | boolean | null | undefined) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export default function Conversions() {
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const loadConversions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      const sessionRes = await fetch('/api/get-store-session');
      const session = await sessionRes.json();

      if (!session.authenticated || !session.store?.id) {
        setError('Not authenticated. Please sign in again.');
        return;
      }

      try {
        const data: any = await apiClient.getConversions(session.store.id);
        setConversions(data.conversions || []);
      } catch {
        setConversions([]);
        setError('Conversion data could not be loaded.');
      }
    } catch {
      setError('Failed to load conversion data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversions();
  }, [loadConversions]);

  const stats = useMemo(() => {
    const addToCartCount = conversions.filter((conversion) => conversion.add_to_cart).length;
    const purchaseCount = conversions.filter((conversion) => /purchase|paid|complete/i.test(conversion.status)).length;
    const conversionRate = conversions.length ? Math.round((addToCartCount / conversions.length) * 100) : 0;
    const purchaseRate = conversions.length ? Math.round((purchaseCount / conversions.length) * 100) : 0;
    const uniqueProducts = new Set(conversions.map((conversion) => conversion.product_id).filter(Boolean)).size;
    return { addToCartCount, purchaseCount, conversionRate, purchaseRate, uniqueProducts };
  }, [conversions]);

  const funnel = [
    { label: 'Try-on intent', value: conversions.length, tone: 'bg-white' },
    { label: 'Add to cart', value: stats.addToCartCount, tone: 'bg-[#14b8a6]' },
    { label: 'Purchase signal', value: stats.purchaseCount, tone: 'bg-[#ff5c8a]' },
  ];
  const funnelMax = Math.max(...funnel.map((item) => item.value), 1);

  const handleExport = () => {
    setIsExporting(true);
    try {
      const headers = ['Date', 'Product ID', 'User ID', 'Add to Cart', 'Status'];
      const csvContent = [
        headers.map(csvCell).join(','),
        ...conversions.map((conversion) =>
          [
            formatDate(conversion.created_at),
            conversion.product_id || '',
            conversion.user_id || '',
            conversion.add_to_cart ? 'Yes' : 'No',
            conversion.status,
          ]
            .map(csvCell)
            .join(','),
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `conversions-${new Date().toISOString().split('T')[0]}.csv`;
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
          eyebrow="Revenue Signals"
          title="Conversion Analytics"
          description="Follow the path from try-on intent to add-to-cart behavior and purchase signals."
          action={
            <>
              <Button variant="secondary" onClick={loadConversions}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={handleExport} disabled={conversions.length === 0} isLoading={isExporting}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </>
          }
        />
      </motion.div>

      {error && (
        <motion.div variants={fade}>
          <AlertBanner tone="danger" title="Conversion issue">
            {error}
          </AlertBanner>
        </motion.div>
      )}

      {conversions.length === 0 ? (
        <motion.div variants={fade}>
          <EmptyState
            icon={TrendingUp}
            title="No conversion data yet"
            description="Conversion signals will appear once shoppers interact with try-ons and storefront actions."
          />
        </motion.div>
      ) : (
        <>
          <motion.div variants={fade} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Signals" value={conversions.length} detail="Tracked conversion events" icon={Target} />
            <MetricCard label="Add to cart" value={stats.addToCartCount} detail={`${stats.conversionRate}% of signals`} icon={ShoppingCart} accent="teal" />
            <MetricCard label="Purchase signal" value={stats.purchaseCount} detail={`${stats.purchaseRate}% of signals`} icon={ShoppingBag} accent="rose" />
            <MetricCard label="Products" value={stats.uniqueProducts} detail="Unique products involved" icon={TrendingUp} accent="emerald" />
          </motion.div>

          <motion.div variants={fade} className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <Badge variant="primary">Funnel</Badge>
              <h2 className="mt-3 text-xl font-black text-[#161616]">Commerce movement</h2>
              <div className="mt-8 space-y-5">
                {funnel.map((step) => {
                  const width = Math.max(8, (step.value / funnelMax) * 100);
                  return (
                    <div key={step.label}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-bold text-[#161616]">{step.label}</span>
                        <span className="font-bold text-[#66736f]">{step.value}</span>
                      </div>
                      <div className="h-4 overflow-hidden rounded-lg bg-[#edf4f1]">
                        <div className={`h-full rounded-lg ${step.tone}`} style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <Badge variant="teal">Quality Read</Badge>
              <h2 className="mt-3 text-xl font-black text-[#161616]">What this means</h2>
              <div className="mt-6 space-y-4 text-sm leading-6 text-[#66736f]">
                <p>
                  A healthy Stylique flow keeps add-to-cart signals close to try-on volume. If add-to-cart is low, review product imagery, Tier 3 products, and widget placement.
                </p>
                <p>
                  Strong purchase signals are usually tied to clear product photos, accurate sizing, and a smooth transition back to the storefront.
                </p>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={fade}>
            <Card className="overflow-hidden p-0">
              <div className="border-b border-[#161616]/10 p-5">
                <Badge variant="default">Conversion Ledger</Badge>
                <h2 className="mt-3 text-xl font-black text-[#161616]">Recent conversion events</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="bg-[#f5f8f6]">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-[#7b8783]">Date</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-[#7b8783]">Product</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-[#7b8783]">Add to Cart</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-[#7b8783]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#161616]/10">
                    {conversions.slice(0, 50).map((conversion) => (
                      <tr key={conversion.id} className="transition hover:bg-[#f5f8f6]">
                        <td className="px-5 py-4 text-sm text-[#4f5d58]">{formatDate(conversion.created_at)}</td>
                        <td className="px-5 py-4 text-xs font-mono text-[#66736f]">
                          {conversion.product_id ? conversion.product_id : 'Not linked'}
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant={conversion.add_to_cart ? 'success' : 'muted'}>
                            {conversion.add_to_cart ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant={/purchase|paid|complete/i.test(conversion.status) ? 'primary' : 'default'}>
                            {conversion.status || 'Viewed'}
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
