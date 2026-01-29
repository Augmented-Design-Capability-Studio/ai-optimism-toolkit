'use client';

import { Paper, Box, Alert, Button } from '@mui/material';
import { useRef, useEffect } from 'react';
import {
  ChatHeader,
  MessagesList,
  ChatInput,
} from '@/core/components/chat';
import { useChatSession } from '../hooks/useChatSession';
import type { Session } from '@/core/services/sessionManager';
import { parseStructuredData } from '@/core/utils/structuredDataParser';
import { parseAnalysisBlockLoose } from '@/core/utils/analysisParser';
import { parseDataBlock } from '@/core/utils/dataParser';
import type { PartialControls } from '@/core/utils/structuredDataParser';
import type { AnalysisBlock } from '@/core/utils/analysisParser';
import type { DataPayload } from '@/core/utils/dataParser';

interface ChatPanelProps {
  onControlsGenerated?: (controls: unknown) => void;
  onSessionUpdate?: (session: Session | null) => void;
  onControlsUpdate?: (controls: PartialControls | null) => void;
  onAnalysisUpdate?: (analysis: AnalysisBlock | null) => void;
  onDataUpdate?: (data: DataPayload | null) => void;
}

export function ChatPanel({
  onControlsGenerated,
  onSessionUpdate,
  onControlsUpdate,
  onAnalysisUpdate,
  onDataUpdate,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const {
    input,
    setInput,
    currentSession,
    mode,
    displayMessages,
    isLoading,
    isWaitingForResearcher,
    sessionTerminated,
    sessionDeleted,
    isCreatingSession,
    createNewSession,
    handleSubmit,
  } = useChatSession();

  // Notify parent when session updates (to sync AppBar's currentSession)
  // Use ref to avoid dependency on callback to prevent infinite loops
  const onSessionUpdateRef = useRef(onSessionUpdate);
  const lastNotifiedSessionRef = useRef<string | null>(null);
  const lastNotifiedUpdatedAtRef = useRef<number | null>(null);
  const lastNotifiedMsgLenRef = useRef<number | null>(null);
  const lastNotifiedAIHashRef = useRef<string | null>(null);
  useEffect(() => {
    onSessionUpdateRef.current = onSessionUpdate;
  }, [onSessionUpdate]);

  const lastParsedMessageRef = useRef<string | null>(null);
  useEffect(() => {
    if (!displayMessages || displayMessages.length === 0) return;
    const lastAssistant = [...displayMessages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant?.content) return;
    if (lastParsedMessageRef.current === lastAssistant.content) return;
    lastParsedMessageRef.current = lastAssistant.content;

    const structuredData = parseStructuredData(lastAssistant.content);
    const analysis = parseAnalysisBlockLoose(lastAssistant.content);
    const dataPayload = parseDataBlock(lastAssistant.content);

    if (onControlsUpdate) onControlsUpdate(structuredData || null);
    if (onAnalysisUpdate) onAnalysisUpdate(analysis || null);
    if (onDataUpdate) onDataUpdate(dataPayload || null);
  }, [displayMessages, onControlsUpdate, onAnalysisUpdate, onDataUpdate]);
  
  useEffect(() => {
    const sess = currentSession;
    if (!sess) {
      if (lastNotifiedSessionRef.current !== null) {
        lastNotifiedSessionRef.current = null;
        lastNotifiedUpdatedAtRef.current = null;
        lastNotifiedMsgLenRef.current = null;
        lastNotifiedAIHashRef.current = null;
        onSessionUpdateRef.current?.(null);
      }
      return;
    }

    const msgLen = Array.isArray(sess.messages) ? sess.messages.length : 0;
    const updatedAt = typeof sess.updatedAt === 'number' ? sess.updatedAt : null;
    const aiHash = sess.aiConfig
      ? [
          sess.aiConfig.status,
          sess.aiConfig.provider,
          sess.aiConfig.model,
          sess.aiConfig.endpoint,
          sess.aiConfig.setBy,
          sess.aiConfig.setAt,
        ].join('|')
      : null;

    const same =
      lastNotifiedSessionRef.current === sess.id &&
      lastNotifiedUpdatedAtRef.current === updatedAt &&
      lastNotifiedMsgLenRef.current === msgLen &&
      lastNotifiedAIHashRef.current === aiHash;

    if (same) return;

    lastNotifiedSessionRef.current = sess.id;
    lastNotifiedUpdatedAtRef.current = updatedAt;
    lastNotifiedMsgLenRef.current = msgLen;
    lastNotifiedAIHashRef.current = aiHash;
    onSessionUpdateRef.current?.(sess);
  }, [currentSession]);

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ChatHeader mode={mode} session={currentSession} />

      {sessionTerminated && !sessionDeleted && (
        <Alert severity="info" sx={{ m: 2 }}>
          Your session was ended by a researcher. Starting a fresh conversation.
        </Alert>
      )}

      {(sessionDeleted || (!currentSession && !isCreatingSession)) && (
        <Alert 
          severity="warning" 
          sx={{ m: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={async () => {
                try {
                  await createNewSession();
                } catch (error: any) {
                  // Handle backend rate limiting (429) when sessions were recently cleared
                  if (error?.response?.status === 429) {
                    const message = error?.response?.data?.detail || error?.message || 'Sessions were recently cleared. Please wait a moment and try again.';
                    alert(message);
                  } else {
                    alert('Failed to create new session. Please try again.');
                  }
                }
              }}
            >
              Create New Session
            </Button>
          }
        >
          Your session has been deleted or terminated. Click the button to start a new session.
        </Alert>
      )}

      <MessagesList
        messages={displayMessages}
        mode={mode}
        apiKey={null}
        isLoading={isLoading}
        messagesEndRef={messagesEndRef}
        messagesContainerRef={messagesContainerRef}
        isWaitingForResearcher={isWaitingForResearcher}
      />
      <ChatInput
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        disabled={sessionDeleted}
      />
    </Paper>
  );
}

