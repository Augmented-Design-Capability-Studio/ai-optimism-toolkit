'use client';

import { memo, useMemo } from 'react';
import { Box, Paper, Typography, Avatar, Chip } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SettingsIcon from '@mui/icons-material/Settings';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { SessionMode } from '../../services/sessionManager';
import { FormalizationMessage, OptimizationRunMessage, NormalMessageContent, ErrorDisplay } from '../shared/chat';

interface MessageBubbleProps {
  message: any;
  mode: SessionMode;
  isGeneratingControls?: boolean;
  onGenerateControls?: (jsonData: string | any) => void; // Accepts both string and object
}

export const MessageBubble = memo(function MessageBubble({ message, mode, isGeneratingControls = false, onGenerateControls }: MessageBubbleProps) {
  // Extract text content from complete messages only
  const { messageRole, textContent } = useMemo(() => {
    let role = message.role;
    let content = '';
  
    if (mode === 'experimental') {
      role = message.role;
      content = message.content;
    } else {
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
    
    return {
      messageRole: role,
      textContent: content,
    };
  }, [
    message, 
    message.parts, // Explicitly include parts for streaming updates
    message.content, // Explicitly include content
    mode
  ]);
  
  // Wrapper for onGenerateControls that handles both objects and strings
  const handleGenerateControls = useMemo(() => {
    if (!onGenerateControls) return undefined;
    return (jsonData: any) => {
      // If it's already a string, pass it through
      // If it's an object, pass it directly (ChatPanel can handle both)
      if (typeof jsonData === 'string') {
        onGenerateControls(jsonData);
      } else {
        // Pass object directly - ChatPanel will handle it
        onGenerateControls(jsonData);
      }
    };
  }, [onGenerateControls]);
  
  const displayRole = messageRole === 'researcher' ? 'assistant' : messageRole;
  
  const isFormalization = message.metadata?.type === 'formalization';
  const isControlsGeneration = message.metadata?.type === 'controls-generation';
  const isOptimizationRun = message.metadata?.type === 'optimization-run';
  const isIncomplete = message.metadata?.incomplete === true || 
    (isFormalization && textContent.toLowerCase().includes('incomplete formalization'));
  const controlsGenerated = message.metadata?.controlsGenerated === true;
  const controlsError = message.metadata?.controlsError;
  
  const shouldHideGeneratingContent = isControlsGeneration && 
    message.content?.includes('Generating optimization controls');
  
  // Determine avatar icon based on message type
  const AvatarIcon = displayRole === 'user' 
    ? PersonIcon 
    : SmartToyIcon;
  
  const avatarColor = displayRole === 'user' 
    ? 'primary.main' 
    : isFormalization && isIncomplete
    ? 'warning.main'
    : isFormalization
    ? 'success.main'
    : isOptimizationRun
    ? 'info.main'
    : isControlsGeneration && controlsGenerated
    ? 'secondary.main'
    : isControlsGeneration && controlsError
    ? 'error.main'
    : 'secondary.main';
  
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
          bgcolor: avatarColor,
          width: 32,
          height: 32,
        }}
      >
        <AvatarIcon sx={{ fontSize: 20, color: 'white' }} />
      </Avatar>
      <Paper
        elevation={1}
        sx={{
          p: 2,
          maxWidth: '70%',
          bgcolor: displayRole === 'user' 
            ? 'primary.light' 
            : isFormalization && isIncomplete
            ? 'rgba(255, 152, 0, 0.15)'
            : isFormalization
            ? 'success.light'
            : isOptimizationRun
            ? 'info.light'
            : isControlsGeneration && controlsGenerated
            ? 'secondary.light'
            : isControlsGeneration && controlsError
            ? 'rgba(211, 47, 47, 0.15)'
            : 'grey.100',
          color: displayRole === 'user' ? 'primary.contrastText' : 'text.primary',
          ...(isFormalization && {
            border: 2,
            borderColor: message.metadata?.error === true 
              ? 'error.main' 
              : isIncomplete 
                ? 'warning.main' 
                : 'success.main',
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
            isError={message.metadata?.error === true}
            errorDetails={message.metadata?.errorDetails as string | undefined}
            onGenerateControls={onGenerateControls}
            isGeneratingControls={isGeneratingControls}
            variant="light"
            structuredData={message.metadata?.structuredData}
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
              {isControlsGeneration && (
                <Box sx={{ mb: 1 }}>
                  {controlsGenerated && (
                    <Chip 
                      icon={<SettingsIcon />}
                      label="Controls Generated" 
                      size="small" 
                      color="secondary"
                    />
                  )}
                  {controlsError && (
                    <Chip 
                      icon={<ErrorOutlineIcon />}
                      label="Generation Failed" 
                      size="small" 
                      color="error"
                    />
                  )}
                </Box>
              )}
              
              {isControlsGeneration && controlsError && (
                <ErrorDisplay
                  error={typeof controlsError === 'string' ? controlsError : 'Generation failed'}
                  details={message.metadata?.errorDetails as string | undefined}
                  title="Error Details"
                  variant="error"
                />
              )}
              
              {!shouldHideGeneratingContent && (
                <NormalMessageContent
                  content={textContent}
                  variant="light"
                  onGenerateControls={handleGenerateControls}
                  isGeneratingControls={isGeneratingControls}
                />
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
  // Always re-render if IDs differ
  if (prevProps.message.id !== nextProps.message.id) return false;
  
  // Always re-render if mode or other props change
  if (prevProps.mode !== nextProps.mode) return false;
  if (prevProps.isGeneratingControls !== nextProps.isGeneratingControls) return false;
  if (prevProps.onGenerateControls !== nextProps.onGenerateControls) return false;
  
  // Check content changes
  if (prevProps.message.content !== nextProps.message.content) return false;
  
  // Check parts changes (for non-streaming messages with parts)
  const prevParts = prevProps.message.parts;
  const nextParts = nextProps.message.parts;
  if (prevParts !== nextParts) {
    if (!prevParts || !nextParts) return false;
    const prevText = prevParts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('');
    const nextText = nextParts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('');
    if (prevText !== nextText) return false;
  }
  
  // Check metadata changes
  const prevMeta = prevProps.message.metadata;
  const nextMeta = nextProps.message.metadata;
  if (prevMeta !== nextMeta) {
    if (!prevMeta || !nextMeta) return false;
    if (JSON.stringify(prevMeta) !== JSON.stringify(nextMeta)) return false;
  }
  
  // Skip render only if everything is the same
  return true;
});

