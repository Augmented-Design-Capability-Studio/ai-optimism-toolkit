/**
 * Message list displaying conversation
 */

import { Box, Avatar, Paper, Typography, Chip, Accordion, AccordionSummary, AccordionDetails, CircularProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useEffect, useRef } from 'react';
import { Message } from '../../services/sessionManager';

interface MessageListProps {
  messages: Message[];
  isFormalizingSession?: boolean;
}

export function MessageList({ messages, isFormalizingSession }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(messages.length);
  
  console.log('[MessageList] Rendering with messages:', messages.length);
  console.log('[MessageList] Messages:', messages);

  // Auto-scroll to bottom only when new messages are added
  useEffect(() => {
    const currentMessageCount = messages.length;
    if (currentMessageCount > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = currentMessageCount;
  }, [messages]);
  
  return (
    <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {messages.map((message) => {
        // Log controls generation messages for debugging
        if (message.metadata?.type === 'controls-generation') {
          console.log('[MessageList] Controls generation message:', {
            id: message.id,
            controlsGenerated: message.metadata?.controlsGenerated,
            controlsError: message.metadata?.controlsError,
            metadata: message.metadata,
          });
        }
        
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
                  : message.metadata?.type === 'controls-generation' && message.metadata?.controlsGenerated
                  ? 'secondary.main' // Purple for successful controls generation
                  : message.metadata?.type === 'optimization-run'
                  ? 'info.main' // Blue for optimization runs
                  : message.metadata?.type === 'formalization'
                  ? 'success.main' // Green for formalization
                  : 'secondary.main',
              width: 32,
              height: 32,
            }}
          >
            {message.sender === 'user' 
              ? '👤' 
              : message.sender === 'researcher' 
              ? '🧙' 
              : message.metadata?.type === 'controls-generation'
              ? '🎛️' // Controls emoji for controls generation
              : message.metadata?.type === 'optimization-run'
              ? '✨' // Same emoji as formalization for consistency
              : message.metadata?.type === 'formalization'
              ? '✨' // Sparkles for formalization
              : '🤖'}
          </Avatar>
          <Paper
            elevation={1}
            sx={{
              p: 2,
              maxWidth: '70%',
              width: '70%',
              bgcolor:
                message.sender === 'user'
                  ? 'grey.100'
                  : message.sender === 'researcher'
                  ? 'info.light'
                  : message.metadata?.incomplete
                  ? 'rgba(255, 152, 0, 0.15)' // Soft amber for incomplete
                  : message.metadata?.type === 'formalization'
                  ? 'success.light'
                  : message.metadata?.type === 'optimization-run'
                  ? 'info.light' // Light blue for optimization runs
                  : message.metadata?.type === 'controls-generation' && message.metadata?.controlsGenerated
                  ? 'secondary.light' // Purple for successful generation
                  : message.metadata?.type === 'controls-generation' && message.metadata?.controlsError
                  ? 'rgba(255, 152, 0, 0.15)' // Soft amber for failed generation
                  : 'grey.100',
              ...(message.metadata?.type === 'formalization' && {
                border: 2,
                borderColor: message.metadata?.incomplete ? 'warning.main' : 'success.main',
              }),
              ...(message.metadata?.type === 'optimization-run' && {
                border: 2,
                borderColor: message.metadata?.status === 'completed' ? 'info.main' : message.metadata?.status === 'failed' ? 'error.main' : 'default',
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
                : message.metadata?.type === 'optimization-run'
                ? 'Optimization Run'
                : message.metadata?.type === 'controls-generation'
                ? 'Controls Generation'
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
            
            {message.metadata?.type === 'optimization-run' ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                {/* Optimization Report Accordion */}
                <Accordion
                  disableGutters
                  elevation={0}
                  sx={{
                    bgcolor: 'transparent',
                    '&:before': { display: 'none' },
                    width: '100%',
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      px: 0,
                      minHeight: 40,
                      width: '100%',
                      '& .MuiAccordionSummary-content': {
                        my: 0.5,
                        width: '100%',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', width: '100%' }}>
                      <Chip
                        label={message.metadata?.status === 'completed' ? '✅ Optimization Completed' : message.metadata?.status === 'failed' ? '❌ Optimization Failed' : '⏳ Optimization Running'}
                        size="small"
                        color={message.metadata?.status === 'completed' ? 'success' : message.metadata?.status === 'failed' ? 'error' : 'default'}
                      />
                      {message.metadata?.bestScore && (
                        <Chip
                          label={`Best Score: ${message.metadata.bestScore.toFixed(3)}`}
                          size="small"
                        />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Click to expand report
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
                    {message.metadata?.runId && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Run ID: {message.metadata.runId}
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
                
                {/* Optimization Packet Accordion */}
                {message.metadata?.optimizationPacket && (
                  <Accordion
                    disableGutters
                    elevation={0}
                    sx={{
                      bgcolor: 'transparent',
                      '&:before': { display: 'none' },
                      width: '100%',
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        px: 0,
                        minHeight: 40,
                        width: '100%',
                        '& .MuiAccordionSummary-content': {
                          my: 0.5,
                          width: '100%',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', width: '100%' }}>
                        <Chip
                          label="📦 Optimization Packet"
                          size="small"
                          color="info"
                        />
                        <Typography variant="caption" color="text.secondary">
                          Click to expand packet sent to server
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 0, pt: 1 }}>
                      <Box sx={{ bgcolor: 'grey.50', p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 'bold' }}>
                          Full optimization packet sent to backend:
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            margin: 0,
                            fontSize: '0.75rem',
                            overflow: 'auto',
                            maxHeight: '400px',
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {JSON.stringify(message.metadata.optimizationPacket, null, 2)}
                        </Box>
                        {message.metadata?.heuristic_map && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 'bold' }}>
                              Heuristic Map:
                            </Typography>
                            <Box
                              component="pre"
                              sx={{
                                margin: 0,
                                fontSize: '0.75rem',
                                overflow: 'auto',
                                maxHeight: '300px',
                                fontFamily: 'monospace',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                              }}
                            >
                              {JSON.stringify(message.metadata.heuristic_map, null, 2)}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                )}
              </Box>
            ) : message.metadata?.type === 'formalization' ? (
              <Accordion
                disableGutters
                elevation={0}
                sx={{
                  bgcolor: 'transparent',
                  '&:before': { display: 'none' },
                  mt: 1,
                  width: '100%',
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    px: 0,
                    minHeight: 40,
                    width: '100%',
                    '& .MuiAccordionSummary-content': {
                      my: 0.5,
                      width: '100%',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', width: '100%' }}>
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
      
      {/* Invisible element to scroll to */}
      <div ref={messagesEndRef} />
    </Box>
  );
}
