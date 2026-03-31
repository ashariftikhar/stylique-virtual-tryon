'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store } from '@/types/api';

export function useAuth() {
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/get-store-session');
        const data = await response.json();

        if (data.authenticated && data.store) {
          setStore(data.store);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          router.push('/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const logout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {
      // Best-effort
    }
    setStore(null);
    setIsAuthenticated(false);
    router.push('/login');
  };

  return { store, isLoading, isAuthenticated, logout };
}
