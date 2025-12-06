/**
 * Session detail panel combining messages and input
 */

import { Paper, Box, Typography } from '@mui/material';
import { useState, useEffect, memo, useRef } from 'react';
import { Session } from '../core/services/sessionManager';
import { SessionHeader } from './SessionHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { getAIConfig } from '../core/services/sessionAIConfig';

interface SessionDetailProps {
  session: Session | null;
  isFormalizingId: string | null;
  onModeToggle: (sessionId: string, mode: 'ai' | 'experimental') => void;
  onFormalize: (sessionId: string) => void;
  onTerminate: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onSendMessage: (sessionId: string, message: string) => void;
  onRequestAIResponse?: (sessionId: string) => void;
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
}: SessionDetailProps) {
  const [hasAIConfig, setHasAIConfig] = useState(false);
  const hasAIConfigRef = useRef(false);

  // Check if session has AI config
  useEffect(() => {
    if (!session?.id) {
      setHasAIConfig(false);
      hasAIConfigRef.current = false;
      return;
    }

    const checkAIConfig = async () => {
      try {
        const config = await getAIConfig(session.id);
        const hasConfig = config !== null;
        // Only update state if value actually changed
        if (hasConfig !== hasAIConfigRef.current) {
          hasAIConfigRef.current = hasConfig;
          setHasAIConfig(hasConfig);
        }
      } catch (error) {
        if (hasAIConfigRef.current) {
          hasAIConfigRef.current = false;
          setHasAIConfig(false);
        }
      }
    };

    checkAIConfig();
    // Poll every 3 seconds to detect when AI config is added
    const interval = setInterval(checkAIConfig, 3000);
    return () => clearInterval(interval);
  }, [session?.id]);

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
        onFormalize={onFormalize}
        onTerminate={onTerminate}
        onDelete={onDelete}
      />
      
      <MessageList 
        messages={session.messages} 
        isFormalizingSession={isFormalizingId === session.id}
      />

      {session.status !== 'formalized' && (
        <MessageInput
          sessionId={session.id}
          onSendMessage={onSendMessage}
          onRequestAIResponse={onRequestAIResponse}
          disabled={session.status === 'completed'}
          sessionStatus={session.status}
          hasAIConfig={hasAIConfig}
        />
      )}
    </Paper>
  );
});
