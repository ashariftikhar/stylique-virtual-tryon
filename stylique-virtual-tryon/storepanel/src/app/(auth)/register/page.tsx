'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle2, Eye, EyeOff, Mail, ShieldCheck, Store } from 'lucide-react';
import { motion } from 'framer-motion';
import { StyliqueLogo } from '@/components/brand/StyliqueLogo';
import { AlertBanner, Badge, Button, Input } from '@/components/ui';
import { classNameMerge } from '@/lib/utils';

function validateDomain(id: string) {
  if (!id || id.trim() === '') return 'Store ID is required';
  if (id.includes(' ')) return 'Store ID cannot contain spaces';
  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})?$/;
  if (!domainRegex.test(id)) return 'Use a valid domain, for example mystore.com';
  return '';
}

export default function StoreRegister() {
  const [store_id, setStore_id] = useState('');
  const [store_name, setStore_name] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [storeIdError, setStoreIdError] = useState('');
  const router = useRouter();

  const passwordScore = useMemo(() => {
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const handleStoreIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStore_id(value);
    setStoreIdError(value ? validateDomain(value) : '');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const domainError = validateDomain(store_id);
    if (domainError) {
      setStoreIdError(domainError);
      setIsLoading(false);
      return;
    }

    if (store_name.trim().length < 2 || store_name.trim().length > 100) {
      setError('Store name must be between 2 and 100 characters.');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.');
      setIsLoading(false);
      return;
    }

    try {
      const registerResponse = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_id,
          store_name: store_name.trim(),
          email: email.trim() || null,
          password,
        }),
      });

      const registerResult = await registerResponse.json();

      if (!registerResult.success) {
        setError(registerResult.error || 'Registration failed.');
        setIsLoading(false);
        return;
      }

      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ store_id, password }),
      });

      const loginResult = await loginResponse.json();

      if (!loginResult.success) {
        localStorage.setItem('registration_success', 'true');
        localStorage.setItem('registered_store_id', store_id);
        router.push('/login');
        return;
      }

      if (loginResult.token) {
        localStorage.setItem('auth_token', loginResult.token);
        localStorage.setItem('store_id', store_id);
      }

      router.push('/');
    } catch {
      setError('Unable to create the store account right now. Please try again.');
      setIsLoading(false);
    }
  };

  const isFormValid =
    Boolean(store_id && store_name && password && confirmPassword) &&
    confirmPassword === password &&
    !storeIdError;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070707] px-4 py-8 text-white">
      <div className="premium-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-0 top-0 h-72 w-72 bg-[#ff5c8a]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 bg-[#14b8a6]/10 blur-3xl" />

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_500px]">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="hidden lg:block"
        >
          <StyliqueLogo markClassName="h-12 w-12" />
          <Badge variant="primary" className="mt-8">
            Launch Workspace
          </Badge>
          <h1 className="mt-5 max-w-2xl text-5xl font-black leading-[1.02] tracking-tight">
            Start with a storefront that feels considered from day one.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-400">
            Create a secure store profile, connect product data, and begin managing virtual try-on quality with a polished operational cockpit.
          </p>
          <div className="mt-8 grid max-w-lg gap-3">
            {['Store identity', 'Protected session', 'Automatic dashboard access'].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <span className="text-sm font-semibold text-zinc-300">{item}</span>
                <CheckCircle2 className="h-4 w-4 text-teal-300" />
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
            <StyliqueLogo className="justify-center" label="Store Setup" />
            <div className="mt-7 inline-flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-white text-black">
              <Store className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-2xl font-black text-white">Create store account</h2>
            <p className="mt-2 text-sm text-zinc-500">Use the same domain you connect from Shopify or WooCommerce.</p>
          </div>

          {error && (
            <AlertBanner tone="danger" title="Registration failed">
              {error}
            </AlertBanner>
          )}

          <form onSubmit={handleRegister} className="mt-6 space-y-5">
            <div>
              <label htmlFor="store_id" className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <Building2 className="h-4 w-4" />
                Store ID
              </label>
              <Input
                id="store_id"
                type="text"
                value={store_id}
                onChange={handleStoreIdChange}
                placeholder="mystore.com or mystore.myshopify.com"
                className={storeIdError ? 'border-red-500/70' : ''}
                disabled={isLoading}
                autoComplete="organization"
              />
              {storeIdError && <p className="mt-2 text-xs font-medium text-red-300">{storeIdError}</p>}
            </div>

            <div>
              <label htmlFor="store_name" className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <Store className="h-4 w-4" />
                Store Name
              </label>
              <Input
                id="store_name"
                type="text"
                value={store_name}
                onChange={(e) => setStore_name(e.target.value)}
                placeholder="Your store name"
                disabled={isLoading}
                autoComplete="organization-title"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <Mail className="h-4 w-4" />
                Email
                <span className="text-xs font-normal text-zinc-600">Optional</span>
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@example.com"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
                    placeholder="At least 6 characters"
                    disabled={isLoading}
                    autoComplete="new-password"
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

              <div>
                <label htmlFor="confirmPassword" className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    disabled={isLoading}
                    autoComplete="new-password"
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
                    aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2" aria-label="Password strength">
              {[0, 1, 2].map((bar) => (
                <div
                  key={bar}
                  className={classNameMerge(
                    'h-1.5 rounded-full',
                    passwordScore > bar ? 'bg-[#14b8a6]' : 'bg-white/10',
                  )}
                />
              ))}
            </div>

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading} disabled={!isFormValid}>
              Create Store Account
            </Button>
          </form>

          <p className="mt-6 border-t border-white/10 pt-6 text-center text-xs text-zinc-500">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-white underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
