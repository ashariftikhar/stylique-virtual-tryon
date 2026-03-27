'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  Shield
} from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function StoreLogin() {
  const [storeId, setStoreId] = useState('');
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
      console.log('Attempting to authenticate store:', storeId);

      // Use API endpoint for authentication
      const response = await fetch('/api/test-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storeId, password }),
      });

      const result = await response.json();
      console.log('Authentication result:', result);

      if (!result.success) {
        setError(result.error || 'Authentication failed');
        return;
      }

      console.log('Authentication successful, redirecting...');
      router.push('/storepanel');
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black overflow-hidden p-4">
      {/* Static gradient background - blended like product pages */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/15 via-transparent to-pink-900/15"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-purple-900/10 via-transparent to-pink-900/10"></div>

      {/* Floating gradient orbs - like product pages */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>

      {/* Sparkling white dots scattered across background with animations */}
      <div className="absolute top-[10%] left-[15%] w-1 h-1 bg-white/20 rounded-full animate-twinkle"></div>
      <div className="absolute top-[20%] left-[80%] w-1.5 h-1.5 bg-white/15 rounded-full animate-twinkle-slow"></div>
      <div className="absolute top-[30%] left-[25%] w-1 h-1 bg-white/25 rounded-full animate-twinkle-fast"></div>
      <div className="absolute top-[40%] left-[70%] w-2 h-2 bg-white/10 rounded-full blur-sm animate-pulse-slow"></div>
      <div className="absolute top-[50%] left-[10%] w-1 h-1 bg-white/20 rounded-full animate-twinkle"></div>
      <div className="absolute top-[60%] left-[85%] w-1.5 h-1.5 bg-white/15 rounded-full animate-twinkle-slow"></div>
      <div className="absolute top-[70%] left-[40%] w-1 h-1 bg-white/25 rounded-full animate-twinkle-fast"></div>
      <div className="absolute top-[80%] left-[60%] w-2 h-2 bg-white/10 rounded-full blur-sm animate-pulse-slow"></div>
      <div className="absolute top-[15%] left-[50%] w-1 h-1 bg-white/20 rounded-full animate-twinkle"></div>
      <div className="absolute top-[35%] left-[90%] w-1.5 h-1.5 bg-white/15 rounded-full animate-twinkle-slow"></div>
      <div className="absolute top-[55%] left-[30%] w-1 h-1 bg-white/25 rounded-full animate-twinkle-fast"></div>
      <div className="absolute top-[75%] left-[20%] w-2 h-2 bg-white/10 rounded-full blur-sm animate-pulse-slow"></div>
      <div className="absolute top-[25%] left-[45%] w-1 h-1 bg-white/20 rounded-full animate-twinkle"></div>
      <div className="absolute top-[65%] left-[75%] w-1.5 h-1.5 bg-white/15 rounded-full animate-twinkle-slow"></div>
      <div className="absolute top-[85%] left-[35%] w-1 h-1 bg-white/25 rounded-full animate-twinkle-fast"></div>
      <div className="absolute top-[45%] left-[55%] w-2 h-2 bg-white/10 rounded-full blur-sm animate-pulse-slow"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="backdrop-blur-sm bg-gray-900/50 border border-gray-800 shadow-2xl">
          <CardHeader className="text-center pb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-6"
            >
              <Image
                src="/stylique_watermark/wordmark@4x.png"
                alt="Stylique"
                width={150}
                height={45}
                className="w-auto h-12"
                style={{
                  filter: 'brightness(0) saturate(100%) invert(48%) sepia(79%) saturate(2476%) hue-rotate(246deg) brightness(118%) contrast(119%)'
                }}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-[#7C3AED] to-[#FF8FAB] bg-clip-text text-transparent">
                Store Panel
              </CardTitle>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <CardDescription className="text-gray-400 mt-2 text-base">
                Access your store dashboard to manage inventory and view analytics
              </CardDescription>
            </motion.div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              onSubmit={handleLogin}
              className="space-y-6"
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <label htmlFor="storeId" className="block text-sm font-semibold text-gray-300 mb-2">
                  Store ID
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="storeId"
                    type="text"
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    placeholder="Enter your store ID"
                    required
                    disabled={isLoading}
                    className="pl-10 h-12 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#642FD7] focus:ring-[#642FD7] transition-all duration-200 text-base md:text-sm"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                <label htmlFor="password" className="block text-sm font-semibold text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                    className="pl-10 pr-10 h-12 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#642FD7] focus:ring-[#642FD7] transition-all duration-200 text-base md:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </motion.div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-[#642FD7] to-[#F4536F] hover:from-[#5a29c4] hover:to-[#e03d5c] text-white font-semibold text-base transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center"
                    >
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </motion.div>
                  ) : (
                    'Sign In to Store Panel'
                  )}
                </Button>
              </motion.div>
            </motion.form>
          </CardContent>
        </Card>
      </motion.div>

      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
        @keyframes twinkle-slow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
        @keyframes twinkle-fast {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.4; }
        }
        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
        .animate-twinkle-slow {
          animation: twinkle-slow 4s ease-in-out infinite;
        }
        .animate-twinkle-fast {
          animation: twinkle-fast 2s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
