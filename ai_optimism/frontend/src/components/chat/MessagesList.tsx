'use client';

import { Box, Paper, CircularProgress, Typography, Avatar } from '@mui/material';
import { SessionMode } from '../../services/sessionManager';
import { MessageBubble } from './MessageBubble';
import { WelcomeMessage } from './WelcomeMessage';

interface MessagesListProps {
  messages: any[];
  mode: SessionMode;
  apiKey: string | null;
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isResearcherTyping?: boolean;
  isWaitingForResearcher?: boolean;
  onGenerateControls?: (formalizationText: string) => void;
  isGenerating?: boolean;
}

export function MessagesList({ 
  messages, 
  mode, 
  apiKey, 
  isLoading, 
  messagesEndRef,
  isResearcherTyping = false,
  isWaitingForResearcher = false,
  onGenerateControls,
  isGenerating = false,
}: MessagesListProps) {
  const shouldShowWelcome = 
    (mode === 'ai' && messages.length === 0) ||
    (mode === 'experimental' && messages.length === 0) ||
    (!apiKey && mode === 'ai');

  return (
    <Box
      sx={{
        flex: 1,
        overflowY: 'auto',
        p: 2,
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
          onGenerateControls={onGenerateControls}
          isGenerating={isGenerating}
        />
      ))}
      
      {(isLoading || isWaitingForResearcher) && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
            🤖
          </Avatar>
          <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CircularProgress size={16} thickness={5} />
            <Typography variant="body2" color="text.secondary">
              Thinking...
            </Typography>
          </Paper>
        </Box>
      )}
      
      {/* Typing indicator when researcher is typing */}
      {isResearcherTyping && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
            🤖
          </Avatar>
          <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.100', minWidth: 80 }}>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', justifyContent: 'center' }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'text.secondary',
                  animation: 'typing 1.4s infinite',
                  animationDelay: '0s',
                  '@keyframes typing': {
                    '0%, 60%, 100%': { opacity: 0.3 },
                    '30%': { opacity: 1 },
                  },
                }}
              />
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'text.secondary',
                  animation: 'typing 1.4s infinite',
                  animationDelay: '0.2s',
                  '@keyframes typing': {
                    '0%, 60%, 100%': { opacity: 0.3 },
                    '30%': { opacity: 1 },
                  },
                }}
              />
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'text.secondary',
                  animation: 'typing 1.4s infinite',
                  animationDelay: '0.4s',
                  '@keyframes typing': {
                    '0%, 60%, 100%': { opacity: 0.3 },
                    '30%': { opacity: 1 },
                  },
                }}
              />
            </Box>
          </Paper>
        </Box>
      )}
      
      <div ref={messagesEndRef} />
    </Box>
  );
}
