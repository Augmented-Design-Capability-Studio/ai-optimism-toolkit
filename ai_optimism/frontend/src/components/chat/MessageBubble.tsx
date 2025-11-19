'use client';

import { Box, Paper, Typography, Avatar, Accordion, AccordionSummary, AccordionDetails, Chip, Button, CircularProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { SessionMode } from '../../services/sessionManager';

interface MessageBubbleProps {
  message: any;
  mode: SessionMode;
  onGenerateControls?: (formalizationText: string) => void;
  isGenerating?: boolean;
}

export function MessageBubble({ message, mode, onGenerateControls, isGenerating = false }: MessageBubbleProps) {
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
  const isGeneration = message.metadata?.type === 'generation';
  const isIncomplete = message.metadata?.incomplete === true;
  const generationStatus = message.metadata?.generationStatus;
  
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
            : isGeneration && generationStatus === 'success'
            ? 'rgba(156, 39, 176, 0.1)' // Light purple for generation success
            : isGeneration && generationStatus === 'failed'
            ? 'rgba(244, 67, 54, 0.1)' // Light red for generation failure
            : isFormalization
            ? 'success.light'
            : 'grey.100',
          color: displayRole === 'user' ? 'primary.contrastText' : 'text.primary',
          ...(isFormalization && {
            border: 2,
            borderColor: isIncomplete ? 'warning.main' : 'success.main',
          }),
          ...(isGeneration && {
            border: 2,
            borderColor: generationStatus === 'success' ? 'secondary.main' : 'error.main',
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {textContent}
                  </ReactMarkdown>
                </Box>
              </AccordionDetails>
            </Accordion>
            
            {/* Generate Controls button for complete formalization - outside accordion */}
            {!isIncomplete && onGenerateControls && (
              <Box sx={{ mt: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="secondary"
                  startIcon={isGenerating ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
                  onClick={() => onGenerateControls(textContent)}
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Generating Controls...' : '✨ Generate Controls Panel'}
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                  Generate optimization controls from this problem definition
                </Typography>
              </Box>
            )}
          </Box>
        ) : isGeneration ? (
          <Box>
            <Box sx={{ mb: 1 }}>
              <Chip
                label={generationStatus === 'success' ? '✨ Controls Generated' : '❌ Generation Failed'}
                size="small"
                color={generationStatus === 'success' ? 'secondary' : 'error'}
              />
            </Box>
            <Typography
              variant="body2"
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {textContent}
            </Typography>
          </Box>
        ) : (
          displayRole === 'assistant' || messageRole === 'researcher' || messageRole === 'ai' ? (
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
            <ReactMarkdown 
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {textContent}
            </ReactMarkdown>
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
