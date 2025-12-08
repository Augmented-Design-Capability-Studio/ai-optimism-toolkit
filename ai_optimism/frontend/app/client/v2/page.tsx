'use client';

import { Box } from '@mui/material';
import { ChatPanel } from '../../../src/clients/v2/components/ChatPanel';
import { CanvasPanel } from '../../../src/clients/v2/components/CanvasPanel';
import { AppBar } from '../../../src/core/components/layout/AppBar';
import { ClientAuthWrapper } from '../../../src/core/components/auth/ClientAuthWrapper';
import { VersionProvider } from '../../../src/core/contexts/VersionContext';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSessionManager, Session } from '../../../src/core/services/sessionManager';
import type { AISessionConfigStatus } from '../../../src/core/services/sessionManager';

export default function ClientV2Page() {
  const sessionManager = useSessionManager();
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const prevSessionRef = useRef<Session | null>(null);
  
  // Load current session on mount
  // ChatPanel's useSessionLifecycle already subscribes to updates, so we'll sync via callback
  useEffect(() => {
    const loadSession = async () => {
      const session = await sessionManager.getCurrentSession();
      setCurrentSession(session);
      prevSessionRef.current = session;
    };
    
    loadSession();
  }, [sessionManager]);

  // Sync currentSession from ChatPanel's subscription (avoids duplicate subscriptions)
  const handleSessionUpdate = useCallback((session: Session | null) => {
    setCurrentSession(session);
    prevSessionRef.current = session;
  }, []);

  // Handle lightweight AI config update (just updates aiConfig field, not whole session)
  const handleAIConfigUpdate = useCallback((sessionId: string, aiConfig: AISessionConfigStatus | null) => {
    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => prev ? { ...prev, aiConfig } : null);
    }
  }, [currentSession?.id]);

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
              onAIConfigUpdate={handleAIConfigUpdate}
            />

            <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, p: 2, minHeight: 0 }}>
              <Box sx={{ height: '100%', overflow: 'hidden' }}>
                <ChatPanel onSessionUpdate={handleSessionUpdate} />
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
