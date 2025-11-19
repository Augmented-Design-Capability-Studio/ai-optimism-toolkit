/**
 * Message list displaying conversation
 */

import { Box, Avatar, Paper, Typography, Chip, Accordion, AccordionSummary, AccordionDetails, CircularProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Message } from '../../services/sessionManager';

interface MessageListProps {
  messages: Message[];
  isFormalizingSession?: boolean;
}

export function MessageList({ messages, isFormalizingSession }: MessageListProps) {
  console.log('[MessageList] Rendering with messages:', messages.length);
  console.log('[MessageList] Messages:', messages);
  
  return (
    <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {messages.map((message) => {
        console.log('[MessageList] Rendering message:', message.id, 'sender:', message.sender, 'metadata:', message.metadata, 'content length:', message.content?.length);
        
        return (
        <Box
          key={message.id}
          sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'flex-start',
            flexDirection: message.sender === 'user' ? 'row' : 'row-reverse',
          }}
        >
          <Avatar
            sx={{
              bgcolor:
                message.sender === 'user'
                  ? 'primary.main'
                  : message.sender === 'researcher'
                  ? 'info.main'
                  : 'secondary.main',
              width: 32,
              height: 32,
            }}
          >
            {message.sender === 'user' ? '👤' : message.sender === 'researcher' ? '🧙' : '🤖'}
          </Avatar>
          <Paper
            elevation={1}
            sx={{
              p: 2,
              maxWidth: '70%',
              bgcolor:
                message.sender === 'user'
                  ? 'grey.100'
                  : message.sender === 'researcher'
                  ? 'info.light'
                  : message.metadata?.incomplete
                  ? 'rgba(255, 152, 0, 0.15)' // Soft amber for incomplete
                  : message.metadata?.type === 'formalization'
                  ? 'success.light'
                  : message.metadata?.type === 'controls-generation' && message.metadata?.controlsGenerated
                  ? 'secondary.light' // Purple for successful generation
                  : message.metadata?.type === 'controls-generation' && message.metadata?.controlsError
                  ? 'rgba(255, 152, 0, 0.15)' // Soft amber for failed generation
                  : 'grey.100',
              ...(message.metadata?.type === 'formalization' && {
                border: 2,
                borderColor: message.metadata?.incomplete ? 'warning.main' : 'success.main',
              }),
              ...(message.metadata?.type === 'controls-generation' && message.metadata?.controlsGenerated && {
                border: 2,
                borderColor: 'secondary.main',
              }),
              ...(message.metadata?.type === 'controls-generation' && message.metadata?.controlsError && {
                border: 2,
                borderColor: 'warning.main',
              }),
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              {message.sender === 'user'
                ? 'User'
                : message.sender === 'researcher'
                ? 'You (Researcher)'
                : message.metadata?.type === 'formalization'
                ? 'AI Formalization'
                : 'AI Assistant'}
            </Typography>
            
            {/* Show chips for controls-generation messages */}
            {message.metadata?.type === 'controls-generation' && (
              <Box sx={{ mb: 1 }}>
                {message.metadata?.controlsGenerated && (
                  <Chip 
                    label="🎛️ Controls Generated" 
                    size="small" 
                    color="secondary"
                  />
                )}
                {message.metadata?.controlsError && (
                  <Chip 
                    label="❌ Generation Failed" 
                    size="small" 
                    color="error"
                  />
                )}
              </Box>
            )}
            
            {/* Show thinking indicator during generation */}
            {message.metadata?.type === 'controls-generation' && !message.metadata?.controlsGenerated && !message.metadata?.controlsError && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <CircularProgress size={16} thickness={5} />
                <Typography variant="body2" color="text.secondary">
                  Generating controls...
                </Typography>
              </Box>
            )}
            
            {message.metadata?.type === 'formalization' ? (
              <Accordion
                disableGutters
                elevation={0}
                sx={{
                  bgcolor: 'transparent',
                  '&:before': { display: 'none' },
                  mt: 1,
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    px: 0,
                    minHeight: 40,
                    '& .MuiAccordionSummary-content': {
                      my: 0.5,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={message.metadata?.incomplete ? '⚠️ Incomplete Formalization' : '✨ Problem Formalized'}
                      size="small"
                      color={message.metadata?.incomplete ? 'warning' : 'success'}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Click to expand
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0, pt: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {message.content}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ) : (
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {message.content}
              </Typography>
            )}
          </Paper>
        </Box>
      );
      })}
      
      {isFormalizingSession && (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'flex-start',
            flexDirection: 'row',
          }}
        >
          <Avatar
            sx={{
              bgcolor: 'success.main',
              width: 32,
              height: 32,
            }}
          >
            ✨
          </Avatar>
          <Paper
            elevation={1}
            sx={{
              p: 2,
              maxWidth: '70%',
              bgcolor: 'success.light',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2">
                Analyzing conversation and formalizing problem...
              </Typography>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
