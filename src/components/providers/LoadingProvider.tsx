'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface LoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean, route?: string) => void;
  loadingRoute: string | null;
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  setIsLoading: () => {},
  loadingRoute: null,
});

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: React.ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState<string | null>(null);
  const [isPageReady, setIsPageReady] = useState(false);
  const pathname = usePathname();

  // Track when page is fully loaded
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageReady(true);
    }, 100); // Small delay to ensure page is fully rendered

    return () => {
      clearTimeout(timer);
      setIsPageReady(false);
    };
  }, [pathname]);

  // Auto-clear loading when pathname changes AND page is ready
  useEffect(() => {
    if (isLoading && isPageReady) {
      // Minimum loading time for smooth UX, then clear
      const timer = setTimeout(() => {
        setIsLoading(false);
        setLoadingRoute(null);
      }, 300); // Minimum loading duration for better visual feedback

      return () => clearTimeout(timer);
    }
  }, [pathname, isLoading, isPageReady]);

  const handleSetLoading = (loading: boolean, route?: string) => {
    setIsLoading(loading);
    setLoadingRoute(route || null);
  };

  return (
    <LoadingContext.Provider 
      value={{ 
        isLoading, 
        setIsLoading: handleSetLoading, 
        loadingRoute 
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}