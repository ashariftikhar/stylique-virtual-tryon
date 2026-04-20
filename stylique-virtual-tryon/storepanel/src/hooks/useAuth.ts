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
        // Check if we have a token in localStorage
        const token = localStorage.getItem('auth_token');
        const storeId = localStorage.getItem('store_id');

        if (!token || !storeId) {
          setIsAuthenticated(false);
          setIsLoading(false);
          router.push('/login');
          return;
        }

        // Token exists, consider user authenticated
        // Store ID can be used to fetch store details if needed
        setIsAuthenticated(true);
        setIsLoading(false);
      } catch {
        setIsAuthenticated(false);
        setIsLoading(false);
        router.push('/login');
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
    
    // Clear token and store ID from localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('store_id');
    
    setStore(null);
    setIsAuthenticated(false);
    router.push('/login');
  };

  return { store, isLoading, isAuthenticated, logout };
}
