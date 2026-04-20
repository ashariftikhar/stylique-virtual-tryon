'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  CheckCircle2,
  Copy,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Sparkles,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import { StyliqueLogo } from '@/components/brand/StyliqueLogo';
import { AlertBanner, Badge, Button } from '@/components/ui';
import { Store as StoreType } from '@/types/api';
import { classNameMerge } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, desc: 'Command center' },
  { href: '/manage', label: 'Inventory', icon: Package, desc: 'Products and readiness' },
  { href: '/upload', label: 'Upload', icon: Upload, desc: 'Manual product entry' },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, desc: 'Try-on events' },
  { href: '/conversions', label: 'Conversions', icon: TrendingUp, desc: 'Cart movement' },
];

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function StorePanelLayout({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<StoreType | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [oauthBanner, setOauthBanner] = useState<{ storeId: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    const urlStoreId = params.get('store_id');
    const setupToken = params.get('setup_token');

    if (urlToken && urlStoreId) {
      localStorage.setItem('auth_token', urlToken);
      localStorage.setItem('store_id', urlStoreId);

      if (setupToken) {
        fetch(`${BACKEND_URL}/api/shopify/setup-credentials?token=${encodeURIComponent(setupToken)}`)
          .then((response) => response.json())
          .then((data) => {
            if (data.success && data.password) {
              setOauthBanner({ storeId: data.storeId || urlStoreId, password: data.password });
            }
          })
          .catch(() => {
            setOauthBanner(null);
          });
      }

      window.history.replaceState({}, '', pathname);
    }

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

  const page = useMemo(
    () =>
      NAV_ITEMS.find((item) =>
        item.href === '/' ? pathname === '/' : pathname.startsWith(item.href),
      ) ?? NAV_ITEMS[0],
    [pathname],
  );

  const storeName = store?.store_name || 'Stylique Store';
  const storeInitial = storeName.slice(0, 1).toUpperCase();

  const handleSignOut = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {
      // Best-effort cleanup happens below.
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('store_id');
    router.replace('/login');
  };

  const handleCopyPassword = async () => {
    if (!oauthBanner) return;
    await navigator.clipboard.writeText(oauthBanner.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#070707]">
        <div className="space-y-4 text-center">
          <StyliqueLogo className="justify-center" />
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-white" />
          <p className="text-sm text-zinc-500">Preparing your store atelier...</p>
        </div>
      </div>
    );
  }

  if (!store) return null;

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <div className="premium-grid pointer-events-none fixed inset-0" />

      {sidebarOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={classNameMerge(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-[#090909]/95 shadow-2xl backdrop-blur-xl transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
          <StyliqueLogo />
          <button
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.06] hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-sm font-black text-black">
              {storeInitial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{storeName}</p>
              <p className="truncate text-xs text-zinc-500">{store.store_id}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon, desc }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={classNameMerge(
                  'group flex items-center gap-3 rounded-lg border px-3 py-3 transition',
                  active
                    ? 'border-white/15 bg-white text-black shadow-[0_18px_44px_rgba(255,255,255,0.08)]'
                    : 'border-transparent text-zinc-500 hover:border-white/10 hover:bg-white/[0.055] hover:text-white',
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{label}</span>
                  <span
                    className={classNameMerge(
                      'block truncate text-[11px]',
                      active ? 'text-black/55' : 'text-zinc-600 group-hover:text-zinc-400',
                    )}
                  >
                    {desc}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 rounded-lg border border-teal-400/20 bg-teal-500/10 p-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-teal-200">
              <Sparkles className="h-3.5 w-3.5" />
              Premium Mode
            </div>
            <p className="mt-2 text-xs leading-5 text-teal-100/70">
              Optimize products, track try-ons, and keep the storefront ready.
            </p>
          </div>
          <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start text-red-300">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      <div className="relative flex min-h-screen flex-col lg:pl-72">
        <header className="sticky top-0 z-20 flex h-20 items-center gap-4 border-b border-white/10 bg-[#070707]/82 px-4 backdrop-blur-xl lg:px-8">
          <button
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.06] hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-600">
              Stylique Store Panel
            </p>
            <h1 className="truncate text-lg font-black text-white">{page.label}</h1>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Badge variant="teal">Live store</Badge>
            <Badge variant="default">Secure session</Badge>
          </div>
        </header>

        {oauthBanner && (
          <div className="px-4 pt-5 lg:px-8">
            <AlertBanner
              tone="success"
              title="Shopify app installed successfully"
              action={
                <Button onClick={handleCopyPassword} variant="success" size="sm">
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy password'}
                </Button>
              }
            >
              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <span>
                  Store ID: <strong className="text-white">{oauthBanner.storeId}</strong>
                </span>
                <span>
                  Password: <strong className="text-white">{oauthBanner.password}</strong>
                </span>
              </div>
              <button
                onClick={() => setOauthBanner(null)}
                className="mt-2 text-xs font-semibold text-emerald-100/70 underline-offset-4 hover:text-white hover:underline"
              >
                Dismiss credentials banner
              </button>
            </AlertBanner>
          </div>
        )}

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
