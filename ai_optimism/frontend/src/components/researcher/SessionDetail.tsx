/**
 * Session detail panel combining messages and input
 */

import { Paper, Box, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Session } from '../../services/sessionManager';
import { SessionHeader } from './SessionHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { getAIConfig } from '../../services/sessionAIConfig';

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

export function SessionDetail({
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

  // Check if session has AI config
  useEffect(() => {
    if (!session?.id) {
      setHasAIConfig(false);
      return;
    }

    const checkAIConfig = async () => {
      try {
        const config = await getAIConfig(session.id);
        setHasAIConfig(!!config && config.status === 'connected');
      } catch (error) {
        setHasAIConfig(false);
      }
    };

    checkAIConfig();
    // Poll for updates every 3 seconds
    const interval = setInterval(checkAIConfig, 3000);
    return () => clearInterval(interval);
  }, [session?.id, session?.updatedAt]);

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
          hasAIConfig={hasAIConfig}
          disabled={session.status === 'completed'}
        />
      )}
    </Paper>
  );
}
