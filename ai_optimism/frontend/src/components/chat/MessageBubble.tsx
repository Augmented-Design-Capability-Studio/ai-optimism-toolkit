'use client';

import { Box, Paper, Typography, Avatar, Accordion, AccordionSummary, AccordionDetails, Chip, Button, CircularProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CodeIcon from '@mui/icons-material/Code';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';
import { SessionMode } from '../../services/sessionManager';

interface MessageBubbleProps {
  message: any;
  mode: SessionMode;
  isGeneratingControls?: boolean;
  onGenerateControls?: (formalizationText: string) => void;
}

// Helper function to extract JSON blocks from text
function extractJSONBlocks(text: string): Array<{ before: string; json: string; after: string }> {
  const blocks: Array<{ before: string; json: string; after: string }> = [];
  let remaining = text;
  let offset = 0;

  // Match ```json ... ``` blocks
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/g;
  let match;
  
  while ((match = jsonBlockRegex.exec(text)) !== null) {
    const before = text.substring(offset, match.index);
    const json = match[1].trim();
    offset = match.index + match[0].length;
    
    blocks.push({
      before,
      json,
      after: '', // Will be filled by next iteration or final remaining
    });
  }
  
  // If we found blocks, update the last one's 'after' with remaining text
  if (blocks.length > 0) {
    blocks[blocks.length - 1].after = text.substring(offset);
  }
  
  return blocks.length > 0 ? blocks : [];
}

// Helper function to split text into parts with JSON blocks
function splitTextWithJSON(text: string): Array<{ type: 'text' | 'json'; content: string }> {
  const jsonBlocks = extractJSONBlocks(text);
  
  if (jsonBlocks.length === 0) {
    return [{ type: 'text', content: text }];
  }
  
  const parts: Array<{ type: 'text' | 'json'; content: string }> = [];
  
  for (let i = 0; i < jsonBlocks.length; i++) {
    const block = jsonBlocks[i];
    if (block.before) {
      parts.push({ type: 'text', content: block.before });
    }
    parts.push({ type: 'json', content: block.json });
    if (i === jsonBlocks.length - 1 && block.after) {
      parts.push({ type: 'text', content: block.after });
    }
  }
  
  return parts;
}

export function MessageBubble({ message, mode, isGeneratingControls = false, onGenerateControls }: MessageBubbleProps) {
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
  
  // Split content into parts with JSON blocks
  const contentParts = splitTextWithJSON(textContent);
  const hasJSON = contentParts.some(p => p.type === 'json');
  
  // Map researcher to assistant for display
  const displayRole = messageRole === 'researcher' ? 'assistant' : messageRole;
  
  // Check if this is a formalization message
  const isFormalization = message.metadata?.type === 'formalization';
  const isControlsGeneration = message.metadata?.type === 'controls-generation';
  // Check for incomplete formalization in both metadata and content (fallback)
  const isIncomplete = message.metadata?.incomplete === true || 
    (isFormalization && textContent.toLowerCase().includes('incomplete formalization'));
  const controlsGenerated = message.metadata?.controlsGenerated === true;
  const controlsError = message.metadata?.controlsError;
  
  // Hide "Generating optimization controls..." messages - we don't show them at all
  const shouldHideGeneratingContent = isControlsGeneration && 
    message.content?.includes('Generating optimization controls');
  
  // Determine avatar emoji based on message type
  const avatarEmoji = displayRole === 'user' 
    ? '👤' 
    : isControlsGeneration
    ? '🎛️'  // Emoji for controls generation
    : messageRole === 'ai' 
    ? '✨'  // Special emoji for AI formalization
    : '🤖';
  
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
            : isFormalization && isIncomplete
            ? 'warning.main' // Amber for incomplete formalization
            : isFormalization
            ? 'success.main' // Green for complete formalization
            : isControlsGeneration && controlsGenerated
            ? 'secondary.main' // Purple for successful generation
            : isControlsGeneration && controlsError
            ? 'error.main' // Red for failed generation
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
            : isFormalization && isIncomplete
            ? 'rgba(255, 152, 0, 0.15)' // Soft amber for incomplete formalization
            : isFormalization
            ? 'success.light' // Green for complete formalization
            : isControlsGeneration && controlsGenerated
            ? 'secondary.light' // Purple for successful generation
            : isControlsGeneration && controlsError
            ? 'rgba(211, 47, 47, 0.15)' // Soft red for failed generation
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
            borderColor: 'error.main',
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
            
            {/* Generate Controls button for complete formalization - show only if controls haven't been generated yet */}
            {!isIncomplete && onGenerateControls && (
              <Box sx={{ mt: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="secondary"
                  startIcon={isGeneratingControls ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
                  onClick={() => onGenerateControls(textContent)}
                  disabled={isGeneratingControls}
                >
                  {isGeneratingControls ? 'Generating Controls...' : '✨ Generate Controls Panel'}
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
            
            {/* Hide "Generating optimization controls..." messages completely */}
            {!shouldHideGeneratingContent && (
              <Box>
                {contentParts.map((part, index) => {
                  if (part.type === 'json') {
                    return (
                      <JSONBlockCollapsible key={`json-${index}`} jsonContent={part.content} />
                    );
                  } else {
                    return (
                      <Box
                        key={`text-${index}`}
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
                          {part.content}
                        </ReactMarkdown>
                      </Box>
                    );
                  }
                })}
              </Box>
            )}
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

// Component for collapsible JSON blocks
function JSONBlockCollapsible({ jsonContent }: { jsonContent: string }) {
  const [expanded, setExpanded] = useState(false);
  
  // Try to format JSON nicely
  let formattedJSON = jsonContent;
  try {
    const parsed = JSON.parse(jsonContent);
    formattedJSON = JSON.stringify(parsed, null, 2);
  } catch (e) {
    // If not valid JSON, use as-is
  }
  
  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => setExpanded(isExpanded)}
      disableGutters
      elevation={0}
      sx={{
        my: 1,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'grey.50',
        '&:before': { display: 'none' },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          px: 1.5,
          py: 1,
          minHeight: 40,
          '& .MuiAccordionSummary-content': {
            my: 0,
            alignItems: 'center',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <CodeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {expanded ? 'Hide structured data' : 'Show structured data (JSON)'}
          </Typography>
          {!expanded && (
            <Chip
              label="JSON"
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: 'primary.light',
                color: 'primary.contrastText',
              }}
            />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.5, pb: 1.5, pt: 0 }}>
        <Box
          component="pre"
          sx={{
            bgcolor: 'grey.100',
            p: 1.5,
            borderRadius: 1,
            overflow: 'auto',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            m: 0,
            maxHeight: '400px',
            border: 1,
            borderColor: 'divider',
          }}
        >
          {formattedJSON}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
