'use client';

import { LoadingProvider } from './LoadingProvider';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <LoadingProvider>
      {children}
    </LoadingProvider>
  );
}