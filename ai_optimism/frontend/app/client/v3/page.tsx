'use client';

import { Box } from '@mui/material';
import { ChatPanel } from '../../../src/clients/v3/components/ChatPanel';
import { ExtractionPanel } from '../../../src/clients/v3/components/ExtractionPanel';
import { AppBar } from '../../../src/core/components/layout/AppBar';
import { ClientAuthWrapper } from '../../../src/core/components/auth/ClientAuthWrapper';
import { VersionProvider } from '../../../src/core/contexts/VersionContext';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSessionManager, Session } from '../../../src/core/services/sessionManager';
import type { AISessionConfigStatus } from '../../../src/core/services/sessionManager';

export default function ClientV3Page() {
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
    setCurrentSession(prev => {
      if (!session && !prev) return prev;
      if (!session || !prev) {
        prevSessionRef.current = session;
        return session;
      }
      const sameId = prev.id === session.id;
      const sameUpdatedAt = prev.updatedAt === session.updatedAt;
      const sameMsgLen = (prev.messages?.length || 0) === (session.messages?.length || 0);
      const aiHash = (cfg: Session['aiConfig']) => cfg
        ? [
            cfg.status,
            cfg.provider,
            cfg.model,
            cfg.endpoint,
            cfg.setBy,
            cfg.setAt,
          ].join('|')
        : null;
      const sameAI = aiHash(prev.aiConfig) === aiHash(session.aiConfig);
      if (sameId && sameUpdatedAt && sameMsgLen && sameAI) {
        return prev;
      }
      prevSessionRef.current = session;
      return session;
    });
  }, []);

  // Handle lightweight AI config update (just updates aiConfig field, not whole session)
  const handleAIConfigUpdate = useCallback((sessionId: string, aiConfig: AISessionConfigStatus | null) => {
    setCurrentSession(prev => {
      if (!prev || prev.id !== sessionId) return prev;
      const hash = (cfg: AISessionConfigStatus | null | undefined) => cfg
        ? [
            cfg.status,
            cfg.provider,
            cfg.model,
            cfg.endpoint,
            cfg.setBy,
            cfg.setAt,
          ].join('|')
        : null;
      if (hash(prev.aiConfig) === hash(aiConfig)) return prev;
      return { ...prev, aiConfig };
    });
  }, []);

  return (
    <ClientAuthWrapper>
      {(handleLogout) => (
        <VersionProvider version="v3">
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#f5f5f5', overflow: 'hidden' }}>
            <AppBar 
              title="AI OPTIMISM TOOLKIT V3"
              color="#ed6c02"
              currentSession={currentSession}
              onLogout={handleLogout}
              onAIConfigUpdate={handleAIConfigUpdate}
            />

            <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, p: 2, minHeight: 0 }}>
              <Box sx={{ height: '100%', overflow: 'hidden' }}>
                <ChatPanel onSessionUpdate={handleSessionUpdate} />
              </Box>
              <Box sx={{ height: '100%', overflow: 'hidden' }}>
                <ExtractionPanel />
              </Box>
            </Box>
          </Box>
        </VersionProvider>
      )}
    </ClientAuthWrapper>
  )
}
