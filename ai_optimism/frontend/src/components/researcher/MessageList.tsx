/**
 * Message list displaying conversation
 */

import { Box, Avatar, Paper, Typography, Chip, Accordion, AccordionSummary, AccordionDetails, CircularProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
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
        
        const isGeneration = message.metadata?.type === 'generation';
        const generationStatus = message.metadata?.generationStatus;
        
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
                  : isGeneration && generationStatus === 'success'
                  ? 'rgba(156, 39, 176, 0.1)' // Light purple for generation success
                  : isGeneration && generationStatus === 'failed'
                  ? 'rgba(244, 67, 54, 0.1)' // Light red for generation failure
                  : message.metadata?.incomplete
                  ? 'rgba(255, 152, 0, 0.15)' // Soft amber for incomplete
                  : 'success.light',
              ...(message.metadata?.type === 'formalization' && {
                border: 2,
                borderColor: message.metadata?.incomplete ? 'warning.main' : 'success.main',
              }),
              ...(isGeneration && {
                border: 2,
                borderColor: generationStatus === 'success' ? 'secondary.main' : 'error.main',
              }),
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              {message.sender === 'user'
                ? 'User'
                : message.sender === 'researcher'
                ? 'You (Researcher)'
                : 'AI Formalization'}
            </Typography>
            
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
                      label={message.metadata?.incomplete ? '⚠️ Incomplete Formalization' : 'Formalized Problem'}
                      size="small"
                      color={message.metadata?.incomplete ? 'warning' : 'success'}
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
                      {message.content}
                    </ReactMarkdown>
                  </Box>
                </AccordionDetails>
              </Accordion>
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
                  {message.content}
                </Typography>
              </Box>
            ) : message.sender !== 'user' ? (
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
                  {message.content}
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
