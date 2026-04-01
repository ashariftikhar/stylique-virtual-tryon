'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  Shield
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function StoreLogin() {
  const [store_id, setStore_id] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('Attempting to authenticate store:', store_id);

      // Use API endpoint for authentication
      const response = await fetch('/api/test-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ store_id, password }),
      });

      const result = await response.json();
      console.log('Authentication result:', result);

      if (!result.success) {
        setError(result.error || 'Authentication failed');
        return;
      }

      // Save token and store ID to localStorage for cross-origin requests
      if (result.token) {
        localStorage.setItem('auth_token', result.token);
        localStorage.setItem('store_id', store_id);
        console.log('Token saved to localStorage');
      }

      console.log('Authentication successful, redirecting...');
      router.push('/');
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

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
              <Shield className="w-7 h-7 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-2">Store Login</h1>
            <p className="text-sm text-gray-400">Access your virtual try-on dashboard</p>
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

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Store ID Input */}
            <div>
              <label htmlFor="store_id" className="block text-sm font-medium text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Store ID
                </div>
              </label>
              <input
                id="store_id"
                type="text"
                value={store_id}
                onChange={(e) => setStore_id(e.target.value)}
                placeholder="Enter your store ID"
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
                  placeholder="Enter your password"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !store_id || !password}
              className="w-full py-2 rounded-lg bg-gradient-to-r from-[#642FD7] to-[#F4536F] text-white font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            Protected by secure authentication
          </p>
        </div>
      </motion.div>
    </div>
  );
}
