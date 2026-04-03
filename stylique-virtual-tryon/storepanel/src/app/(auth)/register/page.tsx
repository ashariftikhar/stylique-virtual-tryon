'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  Shield,
  Mail,
  Store,
  CheckCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

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

  // Validate store ID format (domain name)
  const validateStoreId = (id: string) => {
    if (!id || id.trim() === '') {
      setStoreIdError('Store ID is required');
      return false;
    }
    if (id.includes(' ')) {
      setStoreIdError('Store ID cannot contain spaces');
      return false;
    }
    // Simple domain validation regex
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})?$/;
    if (!domainRegex.test(id)) {
      setStoreIdError('Invalid domain format (e.g., mystore.com)');
      return false;
    }
    setStoreIdError('');
    return true;
  };

  const handleStoreIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStore_id(value);
    if (value) {
      validateStoreId(value);
    } else {
      setStoreIdError('');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Client-side validation
    if (!store_id || !store_name || !password) {
      setError('Store ID, Store Name, and Password are required');
      setIsLoading(false);
      return;
    }

    if (!validateStoreId(store_id)) {
      setIsLoading(false);
      return;
    }

    if (store_name.trim().length < 2 || store_name.trim().length > 100) {
      setError('Store Name must be between 2 and 100 characters');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email address');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Attempting to register store:', store_id);

      const response = await fetch('/api/register', {
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

      const result = await response.json();
      console.log('Registration result:', result);

      if (!result.success) {
        setError(result.error || 'Registration failed');
        return;
      }

      // Registration successful - we're already logged in due to automatic session creation
      console.log('Registration successful, redirecting to dashboard...');
      
      // Redirect to dashboard
      router.push('/');
    } catch (error) {
      console.error('Registration error:', error);
      setError('An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = store_id && store_name && password && confirmPassword === password && !storeIdError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-black overflow-hidden p-4">
      {/* Static gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/15 via-transparent to-pink-900/15"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-purple-900/10 via-transparent to-pink-900/10"></div>

      {/* Floating gradient orbs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>

      {/* Sparkling dots */}
      {[...Array(12)].map((_, i) => (
        <div key={i} className="absolute w-1 h-1 bg-white/20 rounded-full" style={{
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          animation: `twinkle ${2 + Math.random() * 2}s ease-in-out infinite`,
        }}></div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="backdrop-blur-sm bg-gray-900/50 border border-gray-800 shadow-2xl rounded-2xl p-8">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-r from-[#642FD7] to-[#F4536F] mb-4"
            >
              <Store className="w-7 h-7 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-2">Register Store</h1>
            <p className="text-sm text-gray-400">Create your virtual try-on store account</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-900/50 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Store ID Input */}
            <div>
              <label htmlFor="store_id" className="block text-sm font-medium text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Store ID (Domain)
                </div>
              </label>
              <input
                id="store_id"
                type="text"
                value={store_id}
                onChange={handleStoreIdChange}
                placeholder="e.g., mystore.com or myshop.myshopify.com"
                className={`w-full px-4 py-2 rounded-lg bg-gray-800/50 border ${
                  storeIdError ? 'border-red-500' : 'border-gray-700'
                } text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#642FD7] focus:border-transparent`}
                disabled={isLoading}
              />
              {storeIdError && (
                <p className="text-xs text-red-400 mt-1">{storeIdError}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                This must match your website domain (used for WooCommerce/Shopify configuration)
              </p>
            </div>

            {/* Store Name Input */}
            <div>
              <label htmlFor="store_name" className="block text-sm font-medium text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  Store Name
                </div>
              </label>
              <input
                id="store_name"
                type="text"
                value={store_name}
                onChange={(e) => setStore_name(e.target.value)}
                placeholder="Your store name"
                className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#642FD7] focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* Email Input (Optional) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email (Optional)
                </div>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#642FD7] focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Password
                </div>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#642FD7] focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Confirm Password
                </div>
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#642FD7] focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="w-full py-2 rounded-lg bg-gradient-to-r from-[#642FD7] to-[#F4536F] text-white font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </span>
              ) : (
                'Create Store Account'
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-xs text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#642FD7] hover:text-[#F4536F] font-medium transition-colors">
              Sign in here
            </Link>
          </p>

          <p className="text-center text-xs text-gray-500 mt-4 pt-4 border-t border-gray-800">
            Protected by secure authentication
          </p>
        </div>
      </motion.div>
    </div>
  );
}
