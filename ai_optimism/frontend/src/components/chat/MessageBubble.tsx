'use client';

import { memo, useMemo } from 'react';
import { Box, Paper, Typography, Avatar, Chip } from '@mui/material';
import { SessionMode } from '../../services/sessionManager';
import { FormalizationMessage, OptimizationRunMessage, MarkdownContent, splitTextWithJSON, JSONBlockCollapsible } from '../shared/chat';

interface MessageBubbleProps {
  message: any;
  mode: SessionMode;
  isGeneratingControls?: boolean;
  onGenerateControls?: (formalizationText: string) => void;
}

export const MessageBubble = memo(function MessageBubble({ message, mode, isGeneratingControls = false, onGenerateControls }: MessageBubbleProps) {
  // Memoize expensive text processing
  const { messageRole, textContent, contentParts, hasJSON } = useMemo(() => {
  // Determine message role and content based on mode
    let role = message.role;
    let content = '';
  
  if (mode === 'experimental') {
    // Experimental mode: messages have {id, role, content}
      role = message.role;
      content = message.content;
  } else {
    // AI mode: extract text from AI SDK format
    if (message.parts && Array.isArray(message.parts)) {
        content = message.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('');
    } else if (typeof message.content === 'string') {
        content = message.content;
    } else if (message.text) {
        content = message.text;
    } else {
      console.warn('[MessageBubble] Unknown message format:', message);
        content = JSON.stringify(message);
    }
  }
  
  // Split content into parts with JSON blocks
    const parts = splitTextWithJSON(content);
    const hasJson = parts.some(p => p.type === 'json');
    
    return {
      messageRole: role,
      textContent: content,
      contentParts: parts,
      hasJSON: hasJson,
    };
  }, [message, mode]);
  
  // Map researcher to assistant for display
  const displayRole = messageRole === 'researcher' ? 'assistant' : messageRole;
  
  // Check if this is a formalization message
  const isFormalization = message.metadata?.type === 'formalization';
  const isControlsGeneration = message.metadata?.type === 'controls-generation';
  const isOptimizationRun = message.metadata?.type === 'optimization-run';
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
    : '🤖';  // All AI messages use robot emoji
  
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
            : isOptimizationRun
            ? 'info.main' // Blue for optimization runs
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
          maxWidth: '70%',
          bgcolor: displayRole === 'user' 
            ? 'primary.light' 
            : isFormalization && isIncomplete
            ? 'rgba(255, 152, 0, 0.15)' // Soft amber for incomplete formalization
            : isFormalization
            ? 'success.light' // Green for complete formalization
            : isOptimizationRun
            ? 'info.light' // Light blue for optimization runs
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
          ...(isOptimizationRun && {
            border: 2,
            borderColor: message.metadata?.status === 'completed' ? 'info.main' : message.metadata?.status === 'failed' ? 'error.main' : 'default',
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
          <FormalizationMessage
            content={textContent}
            isIncomplete={isIncomplete}
            onGenerateControls={onGenerateControls}
            isGeneratingControls={isGeneratingControls}
            variant="light"
          />
        ) : isOptimizationRun ? (
          <OptimizationRunMessage
            content={textContent}
            status={message.metadata?.status as 'completed' | 'failed' | 'running' | undefined}
            bestScore={message.metadata?.bestScore}
            runId={message.metadata?.runId}
            optimizationPacket={message.metadata?.optimizationPacket}
            heuristicMap={message.metadata?.heuristic_map}
            variant="light"
            useMarkdown={false}
          />
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
                      <MarkdownContent
                        key={`text-${index}`}
                        content={part.content}
                        variant="light"
                      />
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
}, (prevProps, nextProps) => {
  // Custom comparison function for memo - only re-render if props actually changed
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.message.content !== nextProps.message.content) return false;
  if (prevProps.mode !== nextProps.mode) return false;
  if (prevProps.isGeneratingControls !== nextProps.isGeneratingControls) return false;
  if (prevProps.onGenerateControls !== nextProps.onGenerateControls) return false;
  
  // Deep compare metadata
  const prevMeta = prevProps.message.metadata;
  const nextMeta = nextProps.message.metadata;
  if (prevMeta !== nextMeta) {
    if (!prevMeta || !nextMeta) return false;
    if (JSON.stringify(prevMeta) !== JSON.stringify(nextMeta)) return false;
  }
  
  // Compare message parts if they exist
  if (prevProps.message.parts !== nextProps.message.parts) {
    if (JSON.stringify(prevProps.message.parts) !== JSON.stringify(nextProps.message.parts)) {
      return false;
    }
  }
  
  return true; // Props are equal, skip re-render
});
