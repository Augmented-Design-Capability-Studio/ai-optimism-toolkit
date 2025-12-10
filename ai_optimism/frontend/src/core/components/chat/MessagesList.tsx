'use client';

import { Box, Paper, CircularProgress, Typography, Avatar } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useEffect, useState, memo, useCallback } from 'react';
import { SessionMode } from '../../services/sessionManager';
import { MessageBubble } from './MessageBubble';
import { WelcomeMessage } from './WelcomeMessage';

interface MessagesListProps {
  messages: any[];
  mode: SessionMode;
  apiKey: string | null;
  isLoading: boolean;
  status?: string; // Chat status: 'submitted' | 'streaming' | 'idle' | etc.
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  isWaitingForResearcher?: boolean;
  isGenerating?: boolean;
  onGenerateControls?: (formalizationText: string) => void;
}

export const MessagesList = memo(function MessagesList({ 
  messages, 
  mode, 
  apiKey, 
  isLoading, 
  status,
  messagesEndRef,
  messagesContainerRef,
  isWaitingForResearcher = false,
  isGenerating = false,
  onGenerateControls,
}: MessagesListProps) {
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
  // Use immediate scroll during streaming for better visual feedback
  useEffect(() => {
    if (isNearBottom && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      // During streaming, use immediate scroll for better visual feedback
      // Otherwise use smooth scroll for new complete messages
      const scrollBehavior = isLoading ? 'auto' : 'smooth';
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: scrollBehavior,
        });
      });
    }
  }, [messages, isNearBottom, messagesContainerRef, isLoading]);

  // Track if user is scrolled to bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const checkScrollPosition = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setIsNearBottom(distanceFromBottom < 100);
    };

    container.addEventListener('scroll', checkScrollPosition);
    checkScrollPosition();

    return () => container.removeEventListener('scroll', checkScrollPosition);
  }, [messagesContainerRef]);

  const shouldShowWelcome = true;

  return (
    <Box
      ref={messagesContainerRef}
      sx={{
        flex: 1,
        overflowY: 'auto',
        p: 2,
        pb: 6,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {shouldShowWelcome && <WelcomeMessage mode={mode} apiKey={apiKey} />}
      
      {messages.map((message: any, index: number) => (
        <Box
          key={message.id}
          sx={{
            animation: 'fadeIn 0.3s ease-in',
            '@keyframes fadeIn': {
              from: {
                opacity: 0,
                transform: 'translateY(10px)',
              },
              to: {
                opacity: 1,
                transform: 'translateY(0)',
              },
            },
          }}
        >
          <MessageBubble 
            message={message} 
            mode={mode}
            isGeneratingControls={isGenerating}
            onGenerateControls={onGenerateControls}
          />
        </Box>
      ))}
      
      {/* Show "Thinking..." while waiting for response (during submitted or streaming) */}
      {(status === 'submitted' || status === 'streaming' || isWaitingForResearcher) && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
            <SmartToyIcon sx={{ fontSize: 20, color: 'white' }} />
          </Avatar>
          <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CircularProgress size={16} thickness={5} />
            <Typography variant="body2" color="text.secondary">
              Thinking...
            </Typography>
          </Paper>
        </Box>
      )}
      
      <div ref={messagesEndRef} />
    </Box>
  );
}, (prevProps, nextProps) => {
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  
  // Check for content changes in messages (including streaming updates)
  for (let i = 0; i < prevProps.messages.length; i++) {
    const prevMsg = prevProps.messages[i];
    const nextMsg = nextProps.messages[i];
    
    if (prevMsg?.id !== nextMsg?.id) return false;
    
    // Removed streaming-specific logic - we only show complete messages
    
    // Check content changes
    if (prevMsg?.content !== nextMsg?.content) return false;
    
    // Check parts changes (for non-streaming messages with parts)
    const prevParts = prevMsg?.parts;
    const nextParts = nextMsg?.parts;
    if (prevParts !== nextParts) {
      if (!prevParts || !nextParts) return false;
      // Compare the actual text content from parts
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
  }
  
  if (prevProps.mode !== nextProps.mode) return false;
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.isWaitingForResearcher !== nextProps.isWaitingForResearcher) return false;
  if (prevProps.isGenerating !== nextProps.isGenerating) return false;
  
  return true;
});

