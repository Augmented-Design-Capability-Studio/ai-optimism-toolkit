/**
 * Session list sidebar showing all active sessions
 */

import {
  Paper,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
} from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { Session } from '../../services/sessionManager';

interface SessionListProps {
  sessions: Session[];
  selectedSession: Session | null;
  onSelectSession: (session: Session) => void;
  newSessionIds: Set<string>;
}

export function SessionList({
  sessions,
  selectedSession,
  onSelectSession,
  newSessionIds,
}: SessionListProps) {
  return (
    <Paper sx={{ width: 300, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6">Active Sessions</Typography>
        <Typography variant="caption">
          {sessions.length} total
        </Typography>
      </Box>
      <List sx={{ flex: 1, overflow: 'auto' }}>
        {sessions.length === 0 ? (
          <ListItem>
            <ListItemText
              primary="No active sessions"
              secondary="Waiting for users to start chatting..."
            />
          </ListItem>
        ) : (
          sessions.map(session => {
            const lastMessage = session.messages[session.messages.length - 1];
            const isNew = newSessionIds.has(session.id);

            return (
              <ListItemButton
                key={session.id}
                selected={selectedSession?.id === session.id}
                onClick={() => onSelectSession(session)}
                sx={{
                  ...(isNew && {
                    bgcolor: 'success.light',
                    '&:hover': { bgcolor: 'success.main' },
                  }),
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      {Date.now() - session.lastActivity < 25000 && (
                        <FiberManualRecordIcon 
                          sx={{ 
                            fontSize: 12, 
                            color: 'success.main',
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                              '0%, 100%': { opacity: 1 },
                              '50%': { opacity: 0.5 },
                            },
                          }} 
                          title="Client is connected (window/tab is open)"
                        />
                      )}
                      <Typography variant="body2">
                        Session {session.id.slice(-8)}
                      </Typography>
                      {isNew && (
                        <Chip label="NEW" size="small" color="success" />
                      )}
                      {session.mode === 'experimental' && (
                        <Chip label="Experimental" size="small" color="info" />
                      )}
                      {session.status === 'waiting' && (
                        <Chip label="Waiting" size="small" color="warning" />
                      )}
                      {session.status === 'formalized' && (
                        <Chip label="Formalized" size="small" color="success" />
                      )}
                      {session.status === 'completed' && (
                        <Chip label="Terminated" size="small" color="default" />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{session.messages.length} message{session.messages.length !== 1 ? 's' : ''}</span>
                        {session.messages.length > 0 && (
                          <>
                            <span>•</span>
                            <span>
                              Last: {new Date(session.updatedAt).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </>
                        )}
                      </Box>
                      {lastMessage && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            mt: 0.5,
                            color: 'text.secondary',
                          }}
                        >
                          {lastMessage.sender === 'user' ? '👤' : lastMessage.sender === 'researcher' ? '🧙' : '🤖'} {lastMessage.content}
                        </Typography>
                      )}
                    </>
                  }
                />
              </ListItemButton>
            );
          })
        )}
      </List>
    </Paper>
  );
}
