'use client';

import React, { createContext, useContext } from 'react';
import { Store } from '@/types/api';

interface StorePanelContextType {
  store: Store | null;
}

const StorePanelContext = createContext<StorePanelContextType | undefined>(undefined);

export function StorePanelProvider({
  children,
  initialStore,
}: {
  children: React.ReactNode;
  initialStore: Store | null;
}) {
  return (
    <StorePanelContext.Provider value={{ store: initialStore }}>
      {children}
    </StorePanelContext.Provider>
  );
}

export function useStorePanel() {
  const context = useContext(StorePanelContext);
  if (!context) {
    throw new Error('useStorePanel must be used within StorePanelProvider');
  }
  return context;
}
