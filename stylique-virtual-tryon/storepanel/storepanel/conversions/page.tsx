'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import {
    Users,
    Download,
    RefreshCw,
    TrendingUp,
    ShoppingCart
} from 'lucide-react';
import { InventoryItem } from '@/types/store'; // Assuming this exists or similar
import Image from 'next/image';
import { formatPKR } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

interface Conversion {
    id: number;
    created_at: string;
    user_id: string;
    store_id: string;
    product_id: string;
    add_to_cart: boolean;
    status: string;
}

export default function Conversions() {
    const { notify } = useToast();
    const [conversions, setConversions] = useState<Conversion[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [timeRange, setTimeRange] = useState('30d'); // 7d, 30d, 90d, all
    const [storeName, setStoreName] = useState('');

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError('');

            // 1. Fetch Conversions via Server-Side API (Bypasses RLS)
            // Store Name is also returned by this API to avoid client-side cookie parsing
            const convResp = await fetch(`/api/store/conversions?range=${timeRange}`);
            const convResult = await convResp.json();
            
            if (!convResp.ok) throw new Error(convResult.error || 'Failed to fetch conversions');
            
            setStoreName(convResult.storeName || 'Store');
            const convData = convResult.conversions;

            // 2. Fetch Inventory (for product details) using UUID from API
            const storeUuid = convResult.storeUuid;
            
            let invData = [];
            if (storeUuid) {
                 const { data, error: invError } = await supabase
                    .from('inventory')
                    .select('*')
                    .eq('store_id', storeUuid);
                 
                 if (invError) throw invError;
                 invData = data || [];
            } else {
                // Fallback or empty if no UUID returned (shouldn't happen if auth passes)
            }

            setConversions(convData || []);
            setInventory(invData || []);

        } catch {
            // console.error('Data load error', e); 
            setError('Failed to load conversion data');
        } finally {
            setIsLoading(false);
        }
    }, [timeRange]);

    useEffect(() => {
        loadData();
    }, [loadData]);


    // --- Statistics Calculation ---
    const totalConversions = conversions.length;
    const uniqueConverters = new Set(conversions.map(c => c.user_id)).size;
    const totalRevenue = conversions.reduce((acc, c) => {
        const product = inventory.find(i => i.id === c.product_id);
        return acc + (product?.price || 0);
    }, 0);

    // Daily Stats for Chart
    const getDailyStats = () => {
        const days = timeRange === 'all' ? 30 : parseInt(timeRange.replace('d', ''));
        const dailyCounts = new Array(days).fill(0);
        const labels = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

            const start = new Date(date); start.setHours(0, 0, 0, 0);
            const end = new Date(date); end.setHours(23, 59, 59, 999);

            const count = conversions.filter(c => {
                const d = new Date(c.created_at);
                return d >= start && d <= end;
            }).length;

            dailyCounts[days - 1 - i] = count;
        }
        return { labels, data: dailyCounts };
    };

    const { labels, data: dailyData } = getDailyStats();


    // Top Products
    const productPerformance = conversions.reduce((acc, c) => {
        if (!acc[c.product_id]) acc[c.product_id] = 0;
        acc[c.product_id]++;
        return acc;
    }, {} as Record<string, number>);

    const topProducts = Object.entries(productPerformance)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([pid, count]) => {
            const product = inventory.find(i => i.id === pid);
            const fallbackProduct: Partial<InventoryItem> = { product_name: 'Unknown Product', brand: 'ID: ' + pid, image_url: '', price: 0 };
            return { product: product || fallbackProduct, count };
        });


    // Export
    const exportData = () => {
        // Simple CSV export implementation similar to analytics page
        try {
            const csvContent = [
                ['Date', 'Product ID', 'Product Name', 'User ID', 'Store', 'Status'],
                ...conversions.map(c => {
                    const p = inventory.find(i => i.id === c.product_id);
                    return [
                        new Date(c.created_at).toLocaleString(),
                        c.product_id,
                        p?.product_name || 'Unknown',
                        c.user_id,
                        storeName,
                        c.status
                    ].map(v => `"${v}"`).join(',');
                })
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `conversions_${timeRange}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) { console.error(e); notify('Export failed', 'error'); }
    };


    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-[#642FD7] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl lg:text-4xl text-white">Conversion Analytics</h1>
                    <p className="text-gray-400 mt-2">Track Add-to-Cart events from Try-On and Product pages.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={loadData} variant="outline" size="sm" className="flex gap-2"><RefreshCw className="w-4 h-4" /> Refresh</Button>
                    <Button onClick={exportData} variant="outline" size="sm" className="flex gap-2"><Download className="w-4 h-4" /> Export CSV</Button>
                </div>
            </div>

            {error && <div className="text-red-400 border border-red-800 bg-red-900/20 p-3 rounded-lg">{error}</div>}

            {/* Time Range */}
            <div className="bg-[#2a2a2a] rounded-2xl p-6">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-300">Time Range:</span>
                    <div className="flex gap-2">
                        {['7d', '30d', '90d', 'all'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${timeRange === range
                                    ? 'bg-[#642FD7] text-white'
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                            >
                                {range === 'all' ? 'All Time' : range}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#2a2a2a] rounded-2xl p-6">
                    <div className="flex justify-between items-center pb-2">
                        <div className="text-sm font-medium text-white">Total Add-to-Carts</div>
                        <ShoppingCart className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="text-2xl font-bold text-white pt-2">{totalConversions}</div>
                    <p className="text-xs text-gray-400 mt-1">Recorded events</p>
                </div>
                <div className="bg-[#2a2a2a] rounded-2xl p-6">
                    <div className="flex justify-between items-center pb-2">
                        <div className="text-sm font-medium text-white">Unique Users</div>
                        <Users className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-2xl font-bold text-white pt-2">{uniqueConverters}</div>
                    <p className="text-xs text-gray-400 mt-1">Distinct customers</p>
                </div>
                <div className="bg-[#2a2a2a] rounded-2xl p-6">
                    <div className="flex justify-between items-center pb-2">
                        <div className="text-sm font-medium text-white">Potential Revenue</div>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-bold text-white pt-2">{formatPKR(totalRevenue)}</div>
                    <p className="text-xs text-gray-400 mt-1">Based on product value</p>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-[#2a2a2a] rounded-2xl p-6">
                <div className="mb-6">
                    <h3 className="text-lg font-medium text-white">Conversions Trend</h3>
                    <p className="text-sm text-gray-400">Daily add-to-cart volume</p>
                </div>
                <div className="h-64 flex items-end justify-between gap-1">
                    {dailyData.map((val, i) => (
                        <div key={i} className="flex flex-col items-center flex-1 group relative">
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs p-1 rounded z-10 whitespace-nowrap">
                                {val} conversions on {labels[i]}
                            </div>
                            <div
                                className="w-full bg-green-500 rounded-t transition-all duration-300 hover:bg-green-400"
                                style={{
                                    height: `${val > 0 ? Math.max((val / Math.max(...dailyData)) * 200, 4) : 2}px`,
                                    minHeight: '2px'
                                }}
                            />
                            <span className="text-[10px] text-gray-500 mt-2 rotate-45 origin-left truncate w-full">{labels[i]}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Products Table */}
            <div className="bg-[#2a2a2a] rounded-2xl p-6">
                <div className="mb-4">
                    <h3 className="text-lg font-medium text-white">Top Converting Products</h3>
                </div>
                {topProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">No conversion data available yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-700 text-gray-400 text-sm">
                                    <th className="pb-3 pl-2">Product</th>
                                    <th className="pb-3">Conversions</th>
                                    <th className="pb-3 text-right pr-2">Price</th>
                                </tr>
                            </thead>
                            <tbody className="text-white text-sm">
                                {topProducts.map(({ product, count }, idx) => (
                                    <tr key={idx} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
                                        <td className="py-3 pl-2 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                                                {product?.image_url && (
                                                    <Image src={product.image_url || ''} alt={product.product_name || 'Product'} width={40} height={40} className="object-cover w-full h-full" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium">{product?.product_name}</div>
                                                <div className="text-xs text-gray-400">{product?.brand}</div>
                                            </div>
                                        </td>
                                        <td className="py-3 font-semibold text-green-400">{count}</td>
                                        <td className="py-3 text-right pr-2">{product?.price ? formatPKR(product.price) : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>


        </div>
    );
}
