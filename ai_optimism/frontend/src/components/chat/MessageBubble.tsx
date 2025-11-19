'use client';

import { Box, Paper, Typography, Avatar, Accordion, AccordionSummary, AccordionDetails, Chip, Button, CircularProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SessionMode } from '../../services/sessionManager';

interface MessageBubbleProps {
  message: any;
  mode: SessionMode;
  onGenerateControls?: (formalizationText: string) => void;
}

export function MessageBubble({ message, mode, onGenerateControls }: MessageBubbleProps) {
  // Determine message role and content based on mode
  let messageRole = message.role;
  let textContent = '';
  
  if (mode === 'experimental') {
    // Experimental mode: messages have {id, role, content}
    messageRole = message.role;
    textContent = message.content;
  } else {
    // AI mode: extract text from AI SDK format
    if (message.parts && Array.isArray(message.parts)) {
      textContent = message.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('');
    } else if (typeof message.content === 'string') {
      textContent = message.content;
    } else if (message.text) {
      textContent = message.text;
    } else {
      console.warn('[MessageBubble] Unknown message format:', message);
      textContent = JSON.stringify(message);
    }
  }
  
  // Map researcher to assistant for display
  const displayRole = messageRole === 'researcher' ? 'assistant' : messageRole;
  const avatarEmoji = displayRole === 'user' 
    ? '👤' 
    : messageRole === 'ai' 
    ? '✨'  // Special emoji for AI formalization
    : '🤖';
  
  // Check if this is a formalization message
  const isFormalization = message.metadata?.type === 'formalization';
  const isControlsGeneration = message.metadata?.type === 'controls-generation';
  const isIncomplete = message.metadata?.incomplete === true;
  const controlsGenerated = message.metadata?.controlsGenerated === true;
  const controlsError = message.metadata?.controlsError;
  const isGenerating = isControlsGeneration && !controlsGenerated && !controlsError;
  
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'flex-start',
        flexDirection: displayRole === 'user' ? 'row-reverse' : 'row',
      }}
    >
      <Avatar
        sx={{
          bgcolor: displayRole === 'user' 
            ? 'primary.main' 
            : isIncomplete
            ? 'warning.main'
            : isFormalization
            ? 'success.main'
            : isControlsGeneration && controlsGenerated
            ? 'secondary.main' // Purple for successful generation
            : isControlsGeneration && controlsError
            ? 'warning.main' // Amber for failed generation
            : 'secondary.main',
          width: 32,
          height: 32,
        }}
      >
        {avatarEmoji}
      </Avatar>
      <Paper
        elevation={1}
        sx={{
          p: 2,
          maxWidth: '80%',
          bgcolor: displayRole === 'user' 
            ? 'primary.light' 
            : isIncomplete
            ? 'rgba(255, 152, 0, 0.15)' // Soft amber for incomplete
            : isFormalization
            ? 'success.light'
            : isControlsGeneration && controlsGenerated
            ? 'secondary.light' // Purple for successful generation
            : isControlsGeneration && controlsError
            ? 'rgba(255, 152, 0, 0.15)' // Soft amber for failed generation
            : 'grey.100',
          color: displayRole === 'user' ? 'primary.contrastText' : 'text.primary',
          ...(isFormalization && {
            border: 2,
            borderColor: isIncomplete ? 'warning.main' : 'success.main',
          }),
          ...(isControlsGeneration && controlsGenerated && {
            border: 2,
            borderColor: 'secondary.main',
          }),
          ...(isControlsGeneration && controlsError && {
            border: 2,
            borderColor: 'warning.main',
          }),
        }}
      >
        {isFormalization ? (
          <Box>
            <Accordion
              disableGutters
              elevation={0}
              sx={{
                bgcolor: 'transparent',
                '&:before': { display: 'none' },
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={isIncomplete ? '⚠️ Incomplete Formalization' : '✨ Problem Formalized'}
                    size="small"
                    color={isIncomplete ? 'warning' : 'success'}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Click to expand
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0, pt: 1 }}>
                <Box
                  sx={{
                    '& p': { mb: 1 },
                    '& ul, & ol': { pl: 2, mb: 1 },
                    '& li': { mb: 0.5 },
                    '& code': {
                      bgcolor: 'grey.200',
                      px: 0.5,
                      py: 0.25,
                      borderRadius: 0.5,
                      fontFamily: 'monospace',
                      fontSize: '0.875em',
                    },
                    '& pre': {
                      bgcolor: 'grey.200',
                      p: 1,
                      borderRadius: 1,
                      overflow: 'auto',
                      mb: 1,
                    },
                    '& pre code': {
                      bgcolor: 'transparent',
                      p: 0,
                    },
                    '& h1, & h2, & h3, & h4, & h5, & h6': {
                      mt: 2,
                      mb: 1,
                      fontWeight: 'bold',
                    },
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {textContent}
                  </ReactMarkdown>
                </Box>
              </AccordionDetails>
            </Accordion>
            
            {/* Generate Controls button for complete formalization - always show */}
            {!isIncomplete && onGenerateControls && (
              <Box sx={{ mt: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="secondary"
                  startIcon={<AutoFixHighIcon />}
                  onClick={() => onGenerateControls(textContent)}
                >
                  ✨ Generate Controls Panel
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                  Generate optimization controls from this problem definition
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          displayRole === 'assistant' || messageRole === 'researcher' || messageRole === 'ai' ? (
          <Box>
            {/* Show chips for controls-generation messages */}
            {isControlsGeneration && (
              <Box sx={{ mb: 1 }}>
                {controlsGenerated && (
                  <Chip 
                    label="🎛️ Controls Generated" 
                    size="small" 
                    color="secondary"
                  />
                )}
                {controlsError && (
                  <Chip 
                    label="❌ Generation Failed" 
                    size="small" 
                    color="error"
                  />
                )}
              </Box>
            )}
            
            {/* Show thinking indicator during generation */}
            {isGenerating && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <CircularProgress size={16} thickness={5} />
                <Typography variant="body2" color="text.secondary">
                  Generating controls...
                </Typography>
              </Box>
            )}
            
            <Box
              sx={{
                '& p': { mb: 1 },
              '& ul, & ol': { pl: 2, mb: 1 },
              '& li': { mb: 0.5 },
              '& code': {
                bgcolor: 'grey.200',
                px: 0.5,
                py: 0.25,
                borderRadius: 0.5,
                fontFamily: 'monospace',
                fontSize: '0.875em',
              },
              '& pre': {
                bgcolor: 'grey.200',
                p: 1,
                borderRadius: 1,
                overflow: 'auto',
                mb: 1,
              },
              '& pre code': {
                bgcolor: 'transparent',
                p: 0,
              },
              '& table': {
                borderCollapse: 'collapse',
                width: '100%',
                mb: 1,
              },
              '& th, & td': {
                border: '1px solid',
                borderColor: 'divider',
                p: 1,
                textAlign: 'left',
              },
              '& th': {
                bgcolor: 'grey.200',
                fontWeight: 'bold',
              },
              '& h1, & h2, & h3, & h4, & h5, & h6': {
                mt: 2,
                mb: 1,
                fontWeight: 'bold',
              },
              '& blockquote': {
                borderLeft: '4px solid',
                borderColor: 'primary.main',
                pl: 2,
                my: 1,
                color: 'text.secondary',
              },
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {textContent}
            </ReactMarkdown>
          </Box>
          </Box>
          ) : (
            <Typography
              variant="body2"
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {textContent}
            </Typography>
          )
        )}
      </Paper>
    </Box>
  );
}
