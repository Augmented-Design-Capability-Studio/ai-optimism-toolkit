'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CacheProvider } from '@emotion/react';
import { BackendProvider } from '../src/contexts/BackendContext';
import createEmotionCache from '../src/lib/emotionCache';

// Create emotion cache on client side
const clientSideEmotionCache = createEmotionCache();

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
