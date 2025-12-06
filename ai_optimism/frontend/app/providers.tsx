'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { BackendProvider } from '../src/core/contexts/BackendContext';

// Create emotion cache on client side
const clientSideEmotionCache = createCache({ key: 'css', prepend: true });

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  
  return (
    <CacheProvider value={clientSideEmotionCache}>
      <QueryClientProvider client={queryClient}>
        <BackendProvider>
          {children}
        </BackendProvider>
      </QueryClientProvider>
    </CacheProvider>
  );
}
