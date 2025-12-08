/**
 * Session detail panel combining messages and input
 */

import { Paper, Box, Typography } from '@mui/material';
import { useState, useEffect, memo, useRef, useCallback } from 'react';
import { Session, useSessionManager } from '../core/services/sessionManager';
import type { AISessionConfigStatus } from '../core/services/sessionManager';
import { SessionHeader } from './SessionHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { SystemPromptDialog } from './SystemPromptDialog';

interface SessionDetailProps {
  session: Session | null;
  isFormalizingId: string | null;
  onModeToggle: (sessionId: string, mode: 'ai' | 'experimental') => void;
  onFormalize: (sessionId: string) => void;
  onTerminate: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onSendMessage: (sessionId: string, message: string, metadata?: any) => void;
  onRequestAIResponse?: (sessionId: string) => void;
  onRefresh?: () => void;
  onAIConfigUpdate?: (sessionId: string, aiConfig: AISessionConfigStatus | null) => void;
}

export const SessionDetail = memo(function SessionDetail({
  session,
  isFormalizingId,
  onModeToggle,
  onFormalize,
  onTerminate,
  onDelete,
  onSendMessage,
  onRequestAIResponse,
  onRefresh,
  onAIConfigUpdate,
}: SessionDetailProps) {
  const [hasAIConfig, setHasAIConfig] = useState(false);
  const [isGeneratingControls, setIsGeneratingControls] = useState(false);
  const [systemPromptDialogOpen, setSystemPromptDialogOpen] = useState(false);
  const hasAIConfigRef = useRef(false);
  const sessionManager = useSessionManager();

  // Handle lightweight AI config update (just updates aiConfig field, not whole session)
  const handleAIConfigUpdate = useCallback((sessionId: string, aiConfig: AISessionConfigStatus | null) => {
    if (session?.id === sessionId) {
      // Update local state
      const hasConfig = !!aiConfig;
      setHasAIConfig(hasConfig);
      hasAIConfigRef.current = hasConfig;
      
      // Notify parent to update session state
      onAIConfigUpdate?.(sessionId, aiConfig);
    }
  }, [session?.id, onAIConfigUpdate]);

  // Handle toggle ready to formalize
  const handleToggleReadyToFormalize = async () => {
    if (!session?.id) return;
    const newValue = !session.readyToFormalize;
    await sessionManager.updateSession(session.id, { readyToFormalize: newValue });
    if (onRefresh) {
      await onRefresh();
    }
  };

  // Handle reset formalization
  const handleResetFormalization = async (sessionId: string) => {
    if (window.confirm('Reset formalization status to allow re-formalization?')) {
      await sessionManager.updateSession(sessionId, { 
        status: 'active',
        readyToFormalize: false 
      });
      if (onRefresh) {
        await onRefresh();
      }
    }
  };

  // Handle edit system prompt
  const handleEditSystemPrompt = (sessionId: string) => {
    setSystemPromptDialogOpen(true);
  };

  // Handle save system prompt
  const handleSaveSystemPrompt = async (sessionId: string, systemPrompt: string) => {
    // Update session with new system prompt
    await sessionManager.updateSession(sessionId, { systemPrompt });
    if (onRefresh) {
      await onRefresh();
    }
  };

  // Check if session has AI config
  // AI config is now always included in session response, so no separate API call needed
  useEffect(() => {
    if (!session?.id) {
      setHasAIConfig(false);
      hasAIConfigRef.current = false;
      return;
    }

    // Use aiConfig from session
    const hasConfig = !!session.aiConfig;
    if (hasConfig !== hasAIConfigRef.current) {
      hasAIConfigRef.current = hasConfig;
      setHasAIConfig(hasConfig);
    }
  }, [session?.id, session?.aiConfig]);

  // Handle generating controls from JSON data
  const handleGenerateControls = async (jsonData: any) => {
    if (!session?.id || isGeneratingControls) return;

    setIsGeneratingControls(true);
    try {
      // Create a controls-generation message with the JSON data
      await sessionManager.addMessage(
        session.id,
        'researcher',
        'Controls generated from JSON components',
        {
          type: 'controls-generation',
          controlsGenerated: true,
          structuredData: jsonData,
        }
      );

      // Refresh sessions to show the new message
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error: any) {
      console.error('[SessionDetail] Error generating controls:', error);
      alert(`Failed to generate controls: ${error.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingControls(false);
    }
  };

  if (!session) {
    return (
      <Paper sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="h6" gutterBottom>
            No Session Selected
          </Typography>
          <Typography variant="body2">
            Select a session from the list to view details
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <SessionHeader
        session={session}
        isFormalizingId={isFormalizingId}
        onModeToggle={onModeToggle}
        onTerminate={onTerminate}
        onDelete={onDelete}
        onEditSystemPrompt={handleEditSystemPrompt}
        onAIConfigUpdate={handleAIConfigUpdate}
      />
      
      <MessageList 
        messages={session.messages} 
        isFormalizingSession={isFormalizingId === session.id}
        onGenerateControls={handleGenerateControls}
        isGeneratingControls={isGeneratingControls}
      />

      {session.status !== 'formalized' && (
        <MessageInput
          sessionId={session.id}
          onSendMessage={onSendMessage}
          onRequestAIResponse={onRequestAIResponse}
          disabled={session.status === 'completed'}
          sessionStatus={session.status}
          readyToFormalize={session.readyToFormalize || false}
          isFormalizing={isFormalizingId === session.id}
          hasAIConfig={hasAIConfig}
          onToggleReadyToFormalize={handleToggleReadyToFormalize}
          onFormalize={onFormalize}
          onResetFormalization={handleResetFormalization}
        />
      )}

      <SystemPromptDialog
        open={systemPromptDialogOpen}
        sessionId={session.id}
        currentSystemPrompt={session.systemPrompt}
        onClose={() => setSystemPromptDialogOpen(false)}
        onSave={handleSaveSystemPrompt}
      />
    </Paper>
  );
});
