/**
 * Session detail panel combining messages and input
 */

import { Paper, Box, Typography } from '@mui/material';
import { Session } from '../../services/sessionManager';
import { SessionHeader } from './SessionHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

interface SessionDetailProps {
  session: Session | null;
  isFormalizingId: string | null;
  onModeToggle: (sessionId: string, mode: 'ai' | 'experimental') => void;
  onFormalize: (sessionId: string) => void;
  onTerminate: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onSendMessage: (sessionId: string, message: string) => void;
}

export function SessionDetail({
  session,
  isFormalizingId,
  onModeToggle,
  onFormalize,
  onTerminate,
  onDelete,
  onSendMessage,
}: SessionDetailProps) {
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
          disabled={session.status === 'completed'}
        />
      )}
    </Paper>
  );
}
