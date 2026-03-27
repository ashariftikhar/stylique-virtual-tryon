'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Store as StoreType } from '@/types/api';
import { apiClient } from '@/lib/api';

export default function StorePanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [store, setStore] = useState<StoreType | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/get-store-session');
        const data = await response.json();

        if (!data.authenticated || !data.store) {
          router.push('/auth/login');
          return;
        }

        setStore(data.store);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleSignOut = () => {
    document.cookie = 'store_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.replace('/auth/login');
  };

  const getPageTitle = () => {
    if (pathname.includes('/analytics')) return 'Analytics Dashboard';
    if (pathname.includes('/upload')) return 'Upload Item';
    if (pathname.includes('/manage')) return 'Manage Inventory';
    if (pathname.includes('/conversions')) return 'Conversion Analytics';
    return 'Store Dashboard';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#642FD7] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-white">Loading store panel...</p>
          <p className="text-sm text-gray-400">Please wait while we set up your experience</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top Navigation */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{getPageTitle()}</h1>
            <p className="text-sm text-gray-400">{store.store_name}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-900/20 border border-red-900/50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <main className="p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
