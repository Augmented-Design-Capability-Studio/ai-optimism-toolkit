'use client';

import { Box } from '@mui/material';
import { ChatPanel } from '../../../src/clients/v2/components/ChatPanel';
import { CanvasPanel } from '../../../src/clients/v2/components/CanvasPanel';
import { AppBar } from '../../../src/core/components/layout/AppBar';
import { ClientAuthWrapper } from '../../../src/core/components/auth/ClientAuthWrapper';
import { VersionProvider } from '../../../src/core/contexts/VersionContext';
import { useState, useEffect, useRef } from 'react';
import { useSessionManager, Session } from '../../../src/core/services/sessionManager';

export default function ClientV2Page() {
  const sessionManager = useSessionManager();
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const prevSessionRef = useRef<Session | null>(null);
  
  useEffect(() => {
    const loadSession = async () => {
      const session = await sessionManager.getCurrentSession();
      if (!prevSessionRef.current || 
          prevSessionRef.current.id !== session?.id ||
          prevSessionRef.current.status !== session?.status ||
          prevSessionRef.current.messages?.length !== session?.messages?.length) {
        prevSessionRef.current = session;
        setCurrentSession(session);
      }
    };
    
    loadSession();
    const interval = setInterval(loadSession, 2000);
    return () => clearInterval(interval);
  }, [sessionManager]);

  return (
    <ClientAuthWrapper>
      {(handleLogout) => (
        <VersionProvider version="v2">
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#f5f5f5', overflow: 'hidden' }}>
            <AppBar 
              title="AI OPTIMISM TOOLKIT V2"
              color="#2e7d32"
              currentSession={currentSession}
              onLogout={handleLogout}
            />

            <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, p: 2, minHeight: 0 }}>
              <Box sx={{ height: '100%', overflow: 'hidden' }}>
                <ChatPanel />
              </Box>
              <Box sx={{ height: '100%', overflow: 'hidden' }}>
                <CanvasPanel />
              </Box>
            </Box>
          </Box>
        </VersionProvider>
      )}
    </ClientAuthWrapper>
  )
}
