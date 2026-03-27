'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
// import { supabase } from '@/lib/supabaseClient';
import { StoreSidebar } from '@/components/(storepanel)/StoreSidebar';
import { StoreTopBar } from '@/components/(storepanel)/StoreTopbar';
import { Store as StoreType } from '@/types/store';
import { StorePanelProvider } from '@/contexts/StorePanelContext';
import { ToastProvider } from '@/components/ui/toast';

export default function StorePanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [store, setStore] = useState<StoreType | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Determine active tab based on pathname
  const getActiveTab = () => {
    if (pathname.includes('/analytics')) return 'analytics';
    if (pathname.includes('/upload')) return 'upload';
    if (pathname.includes('/manage')) return 'manage';
    if (pathname.includes('/conversions')) return 'conversions';
    return 'home';
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  // Update active tab when pathname changes
  useEffect(() => {
    const getCurrentActiveTab = () => {
      if (pathname.includes('/analytics')) return 'analytics';
      if (pathname.includes('/upload')) return 'upload';
      if (pathname.includes('/manage')) return 'manage';
      if (pathname.includes('/conversions')) return 'conversions';
      return 'home';
    };
    setActiveTab(getCurrentActiveTab());
  }, [pathname]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/get-store-session');
        const data = await response.json();

        if (!data.authenticated || !data.store) {
           router.push('/storepanel-login');
           return;
        }

        // Store data is now safely retrieved from API
        setStore(data.store); // Consider fetching full store details if needed, but session usually has name/id
        
        // If we strictly need full DB row (e.g. for specific settings), we could fetch it via a secure API
        // For now, let's assume session data is enough OR we fetch valid store details from a new secure endpoint
        // But to keep it simple and secure: relying on what /api/get-store-session returns is safest.
        
        // If we really need the full row, we should add an endpoint for it. 
        // Currently layout fetches from supabase directly using the uuid from cookie.
        // We should move that to an API.
        // Let's create /api/store/profile or similar.
        // For now, let's use the session data which likely has what we need (name, id).
        // If we need more, we'll hit the API.
        
      } catch {
        // Silent error handling for auth check
        router.push('/storepanel-login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleSignOut = () => {
    document.cookie = 'store_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.replace('/storepanel-login');
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
          <p className="text-white" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>Loading store panel...</p>
          <p className="text-sm text-gray-400" style={{ fontFamily: 'PPValve ExtraLight, sans-serif', fontWeight: 200 }}>Please wait while we set up your experience</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return null; // Will redirect to login
  }

  return (
    <StorePanelProvider initialStore={store}>
      <ToastProvider>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 bg-white text-black px-3 py-2 rounded shadow">Skip to content</a>
        <div className="min-h-screen bg-black flex">
          {/* Sidebar */}
          <StoreSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0 lg:ml-[300px]">
            {/* Top Bar */}
            <StoreTopBar
              pageTitle={getPageTitle()}
              store={store}
              onSignOut={handleSignOut}
            />

            {/* Page Content */}
            <main id="main-content" className="flex-1 p-6 lg:p-8 overflow-auto bg-black">
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </StorePanelProvider>
  );
} 