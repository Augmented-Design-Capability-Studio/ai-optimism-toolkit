'use client';

import { Box } from '@mui/material';
import { ChatPanel } from '../../../src/clients/v2/components/ChatPanel';
import { ReasoningPanel } from '../../../src/clients/v2/components/ReasoningPanel';
import { ProblemSetupPanel } from '../../../src/clients/v2/components/ProblemSetupPanel';
import { DataPanel } from '../../../src/clients/v2/components/DataPanel';
import { AppBar } from '../../../src/core/components/layout/AppBar';
import { ClientAuthWrapper } from '../../../src/core/components/auth/ClientAuthWrapper';
import { VersionProvider } from '../../../src/core/contexts/VersionContext';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSessionManager, Session, Message } from '../../../src/core/services/sessionManager';
import type { AISessionConfigStatus } from '../../../src/core/services/sessionManager';
import { aggregateControlsFromMessages } from '../../../src/core/services/controlsAggregator';
import { getLatestAnalysisFromMessages } from '../../../src/clients/v2/services/analysisAggregator';
import { getLatestDataFromMessages } from '../../../src/clients/v2/services/dataAggregator';
import type { AnalysisBlock } from '../../../src/core/utils/analysisParser';
import type { DataPayload } from '../../../src/core/utils/dataParser';
import type { Controls } from '../../../src/core/components/controls/types';
import type { PartialControls } from '../../../src/core/utils/structuredDataParser';

export default function ClientV2Page() {
  const sessionManager = useSessionManager();
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const prevSessionRef = useRef<Session | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisBlock | null>(null);
  const [controls, setControls] = useState<Controls | null>(null);
  const [dataPayload, setDataPayload] = useState<DataPayload | null>(null);
  
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

  useEffect(() => {
    if (!currentSession?.messages) {
      setAnalysis(null);
      setControls(null);
      setDataPayload(null);
      return;
    }
    setAnalysis(getLatestAnalysisFromMessages(currentSession.messages));
    setControls(aggregateControlsFromMessages(currentSession.messages));
    setDataPayload(getLatestDataFromMessages(currentSession.messages));
  }, [currentSession?.id, currentSession?.messages?.length]);

  const appendLocalMessage = useCallback((content: string, metadata?: Message['metadata']) => {
    if (!currentSession) return;
    const now = Date.now();
    const localMessage = {
      id: `local-${now}`,
      sessionId: currentSession.id,
      sender: 'user' as const,
      content,
      timestamp: now,
      metadata,
    };
    const nextMessages = [...(currentSession.messages || []), localMessage];
    setAnalysis(getLatestAnalysisFromMessages(nextMessages));
    setControls(aggregateControlsFromMessages(nextMessages));
    setDataPayload(getLatestDataFromMessages(nextMessages));
  }, [currentSession]);

  const handleAnalysisSave = useCallback(async (nextAnalysis: AnalysisBlock) => {
    if (!currentSession) return;
    setAnalysis(nextAnalysis);
    const content = `Updated reasoning panel:\n\`\`\`analysis\n${JSON.stringify(nextAnalysis, null, 2)}\n\`\`\``;
    const metadata = { type: 'panel-update' as const, analysis: nextAnalysis };
    appendLocalMessage(content, metadata);
    await sessionManager.addMessage(currentSession.id, 'user', content, metadata);
  }, [appendLocalMessage, currentSession, sessionManager]);

  const handleComponentApply = useCallback(async (
    component: 'variables' | 'objectives' | 'constraints' | 'properties',
    data: Array<Record<string, unknown>>
  ) => {
    if (!currentSession) return;
    const payload = { [component]: data };
    const content = `Updated ${component}:\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
    const metadata = {
      type: `${component}-update` as const,
      structuredData: payload,
    };
    appendLocalMessage(content, metadata);
    await sessionManager.addMessage(currentSession.id, 'user', content, metadata);
  }, [appendLocalMessage, currentSession, sessionManager]);

  const handleDataSave = useCallback(async (nextData: DataPayload) => {
    if (!currentSession) return;
    setDataPayload(nextData);
    const content = `Updated data panel:\n\`\`\`data\n${JSON.stringify(nextData, null, 2)}\n\`\`\``;
    const metadata = { type: 'panel-update' as const, dataPayload: nextData };
    appendLocalMessage(content, metadata);
    await sessionManager.addMessage(currentSession.id, 'user', content, metadata);
  }, [appendLocalMessage, currentSession, sessionManager]);

  const handleControlsUpdate = useCallback((partial: PartialControls | null) => {
    if (!partial) return;
    setControls((prev) => {
      const base: Controls = prev || { variables: [] };
      return {
        ...base,
        ...(partial.variables ? { variables: partial.variables as any } : {}),
        ...(partial.objectives ? { objectives: partial.objectives as any } : {}),
        ...(partial.constraints ? { constraints: partial.constraints as any } : {}),
        ...(partial.properties ? { properties: partial.properties as any } : {}),
      };
    });
  }, []);

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

            <Box sx={{ flex: 1, display: 'grid', gridTemplateRows: 'minmax(0, 1fr) 260px', gap: 2, p: 2, minHeight: 0 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1.1fr', gap: 2, minHeight: 0 }}>
                <Box sx={{ height: '100%', overflow: 'hidden' }}>
                  <ChatPanel
                    onSessionUpdate={handleSessionUpdate}
                    onControlsUpdate={handleControlsUpdate}
                    onAnalysisUpdate={setAnalysis}
                    onDataUpdate={setDataPayload}
                  />
                </Box>
                <Box sx={{ height: '100%', overflow: 'hidden' }}>
                  <ReasoningPanel analysis={analysis} onSave={handleAnalysisSave} />
                </Box>
                <Box sx={{ height: '100%', overflow: 'hidden' }}>
                  <ProblemSetupPanel controls={controls} onApplyComponent={handleComponentApply} />
                </Box>
              </Box>
              <Box sx={{ height: '100%', overflow: 'hidden' }}>
                <DataPanel dataPayload={dataPayload} onSave={handleDataSave} />
              </Box>
            </Box>
          </Box>
        </VersionProvider>
      )}
    </ClientAuthWrapper>
  )
}
