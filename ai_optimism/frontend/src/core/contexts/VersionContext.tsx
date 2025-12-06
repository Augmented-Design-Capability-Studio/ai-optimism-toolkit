'use client';

import { createContext, useContext, ReactNode } from 'react';

interface VersionContextType {
  version: string;
}

const VersionContext = createContext<VersionContextType | undefined>(undefined);

export function VersionProvider({ version, children }: { version: string; children: ReactNode }) {
  return <VersionContext.Provider value={{ version }}>{children}</VersionContext.Provider>;
}

export function useVersion(): string | undefined {
  const context = useContext(VersionContext);
  return context?.version;
}

