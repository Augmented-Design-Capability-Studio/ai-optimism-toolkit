import { ReactNode } from 'react';
import Providers from './providers';
import '../src/index.css';
import 'katex/dist/katex.min.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Optimism Toolkit',
  description: 'AI-assisted optimization tool',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

