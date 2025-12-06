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
  messagesEndRef,
  messagesContainerRef,
  isWaitingForResearcher = false,
  isGenerating = false,
  onGenerateControls,
}: MessagesListProps) {
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (isNearBottom && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      });
    }
  }, [messages, isNearBottom, messagesContainerRef]);

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
      
      {messages.map((message: any) => (
        <MessageBubble 
          key={message.id} 
          message={message} 
          mode={mode}
          isGeneratingControls={isGenerating}
          onGenerateControls={onGenerateControls}
        />
      ))}
      
      {(isLoading || isWaitingForResearcher) && (
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
  
  for (let i = 0; i < prevProps.messages.length; i++) {
    if (prevProps.messages[i]?.id !== nextProps.messages[i]?.id) return false;
    if (prevProps.messages[i]?.content !== nextProps.messages[i]?.content) return false;
  }
  
  if (prevProps.mode !== nextProps.mode) return false;
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.isWaitingForResearcher !== nextProps.isWaitingForResearcher) return false;
  if (prevProps.isGenerating !== nextProps.isGenerating) return false;
  
  return true;
});

