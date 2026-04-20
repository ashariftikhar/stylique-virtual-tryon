'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { StyliqueLogo } from '@/components/brand/StyliqueLogo';
import { AlertBanner, Badge, Button, Input } from '@/components/ui';

const atelierPoints = [
  'Secure store access',
  'Try-on readiness dashboard',
  'Inventory and conversion control',
];

export default function StoreLogin() {
  const [store_id, setStore_id] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [registeredStore, setRegisteredStore] = useState('');
  const router = useRouter();

  useEffect(() => {
    const registered = localStorage.getItem('registration_success');
    const registeredId = localStorage.getItem('registered_store_id');
    if (registered && registeredId) {
      setRegisteredStore(registeredId);
      setStore_id(registeredId);
      localStorage.removeItem('registration_success');
      localStorage.removeItem('registered_store_id');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ store_id, password }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Authentication failed');
        return;
      }

      if (result.token) {
        localStorage.setItem('auth_token', result.token);
        localStorage.setItem('store_id', store_id);
      }

      router.push('/');
    } catch {
      setError('Unable to sign in right now. Please check the backend connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070707] px-4 py-8 text-white">
      <div className="premium-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-0 top-0 h-72 w-72 bg-[#ff5c8a]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 bg-[#14b8a6]/10 blur-3xl" />

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_440px]">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="hidden lg:block"
        >
          <StyliqueLogo markClassName="h-12 w-12" />
          <Badge variant="teal" className="mt-8">
            Store Atelier
          </Badge>
          <h1 className="mt-5 max-w-2xl text-5xl font-black leading-[1.02] tracking-tight">
            Your premium control room for virtual try-on commerce.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-400">
            Monitor product readiness, protect image quality, and track the moments that move shoppers from try-on to checkout.
          </p>
          <div className="mt-8 grid gap-3">
            {atelierPoints.map((point) => (
              <div key={point} className="flex items-center gap-3 text-sm font-semibold text-zinc-300">
                <span className="h-2 w-2 rounded-full bg-[#ff5c8a]" />
                {point}
              </div>
            ))}
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="rounded-lg border border-white/10 bg-zinc-950/82 p-6 shadow-[0_32px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8"
        >
          <div className="mb-8 text-center">
            <StyliqueLogo className="justify-center" label="Store Access" />
            <div className="mt-7 inline-flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-white text-black">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-2xl font-black text-white">Sign in to Stylique</h2>
            <p className="mt-2 text-sm text-zinc-500">Access inventory, analytics, and storefront readiness.</p>
          </div>

          {registeredStore && (
            <AlertBanner tone="success" title="Store created">
              {registeredStore} is ready. Sign in with the password you created.
            </AlertBanner>
          )}

          {error && (
            <AlertBanner tone="danger" title="Sign in failed" className="mt-4">
              {error}
            </AlertBanner>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-5">
            <div>
              <label htmlFor="store_id" className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <Building2 className="h-4 w-4" />
                Store ID
              </label>
              <Input
                id="store_id"
                type="text"
                value={store_id}
                onChange={(e) => setStore_id(e.target.value)}
                placeholder="mystore.com or mystore.myshopify.com"
                disabled={isLoading}
                autoComplete="organization"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <ShieldCheck className="h-4 w-4" />
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading} disabled={!store_id || !password}>
              Sign In
            </Button>
          </form>

          <p className="mt-6 border-t border-white/10 pt-6 text-center text-xs text-zinc-500">
            Need a store account?{' '}
            <Link href="/register" className="font-bold text-white underline-offset-4 hover:underline">
              Create one
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
