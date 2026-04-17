'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Store as StoreType } from '@/types/api';
import {
  LayoutDashboard,
  Package,
  Upload,
  BarChart3,
  TrendingUp,
  LogOut,
  Menu,
  X,
  CheckCircle,
  Copy,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/manage', label: 'Inventory', icon: Package },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/conversions', label: 'Conversions', icon: TrendingUp },
];

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function StorePanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [store, setStore] = useState<StoreType | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [oauthBanner, setOauthBanner] = useState<{ storeId: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Capture token from URL (auto-login after Shopify OAuth)
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    const urlStoreId = params.get('store_id');
    const setupToken = params.get('setup_token');

    if (urlToken && urlStoreId) {
      localStorage.setItem('auth_token', urlToken);
      localStorage.setItem('store_id', urlStoreId);
      console.log('[Layout] OAuth auto-login: token + store_id saved to localStorage');

      if (setupToken) {
        fetch(`${BACKEND_URL}/api/shopify/setup-credentials?token=${encodeURIComponent(setupToken)}`)
          .then((response) => response.json())
          .then((data) => {
            if (data.success && data.password) {
              setOauthBanner({ storeId: data.storeId || urlStoreId, password: data.password });
            }
          })
          .catch((error) => {
            console.warn('[Layout] Failed to redeem Shopify setup token:', error);
          });
      }

      window.history.replaceState({}, '', pathname);
    }

    // 2. Check localStorage for auth
    const token = localStorage.getItem('auth_token');
    const storeId = localStorage.getItem('store_id');

    if (!token || !storeId) {
      setLoading(false);
      router.push('/login');
      return;
    }

    setStore({
      store_id: storeId,
      store_name: storeId.replace('.myshopify.com', ''),
    } as StoreType);
    setLoading(false);
  }, [router, pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {
      // Best-effort
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('store_id');
    router.replace('/login');
  };

  const handleCopyPassword = () => {
    if (oauthBanner) {
      navigator.clipboard.writeText(oauthBanner.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#642FD7] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white">Loading store panel...</p>
        </div>
      </div>
    );
  }

  if (!store) return null;

  return (
    <div className="min-h-screen bg-black flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-gray-950 border-r border-gray-800/60
          flex flex-col transition-transform duration-200
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-800/60 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#642FD7] to-[#F4536F] flex items-center justify-center text-white text-sm font-bold">
            S
          </div>
          <span className="text-white font-semibold tracking-tight">Stylique</span>
          <button
            className="ml-auto p-1 text-gray-400 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${
                    active
                      ? 'bg-[#642FD7]/15 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }
                `}
              >
                <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-[#642FD7]' : ''}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Store info + sign out */}
        <div className="border-t border-gray-800/60 p-4 space-y-3 shrink-0">
          <div className="px-1">
            <p className="text-xs text-gray-500 truncate">{store.store_id}</p>
            <p className="text-sm text-white font-medium truncate">{store.store_name}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 flex items-center gap-4 px-4 lg:px-8 border-b border-gray-800/60 bg-gray-950/50 backdrop-blur-sm shrink-0">
          <button
            className="p-2 -ml-2 text-gray-400 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-white truncate">
            {NAV_ITEMS.find(
              (n) =>
                n.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(n.href),
            )?.label ?? 'Dashboard'}
          </h1>
        </header>

        {/* OAuth success banner with credentials */}
        {oauthBanner && (
          <div className="mx-4 lg:mx-8 mt-4 p-4 rounded-xl bg-emerald-900/30 border border-emerald-700/50">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-300">Shopify App Installed Successfully!</p>
                <p className="text-xs text-emerald-400/80 mt-1">
                  Your login credentials for future access:
                </p>
                <div className="mt-2 p-3 rounded-lg bg-black/40 font-mono text-xs text-white space-y-1">
                  <p>Store ID: <span className="text-emerald-300">{oauthBanner.storeId}</span></p>
                  <div className="flex items-center gap-2">
                    <p>Password: <span className="text-emerald-300">{oauthBanner.password}</span></p>
                    <button
                      onClick={handleCopyPassword}
                      className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white"
                      title="Copy password"
                    >
                      {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-emerald-400/60 mt-2">Save these credentials. You can use them to log in at the login page.</p>
              </div>
              <button
                onClick={() => setOauthBanner(null)}
                className="p-1 text-emerald-400/60 hover:text-emerald-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
