/**
 * Input area for researcher to send messages
 */

import { useState, useEffect, useRef } from 'react';
import { Box, TextField, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { sessionManager } from '../../services/sessionManager';

interface MessageInputProps {
  sessionId: string;
  onSendMessage: (sessionId: string, message: string) => void;
  disabled?: boolean;
}

export function MessageInput({ sessionId, onSendMessage, disabled }: MessageInputProps) {
  const [input, setInput] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle typing indicator
  useEffect(() => {
    if (disabled) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (input.trim().length > 0) {
      // Set typing to true
      sessionManager.setResearcherTyping(sessionId, true);

      // Set timeout to clear typing indicator after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        sessionManager.setResearcherTyping(sessionId, false);
      }, 2000);
    } else {
      // Clear typing indicator if input is empty
      sessionManager.setResearcherTyping(sessionId, false);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [input, sessionId, disabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;

    // Clear typing indicator
    sessionManager.setResearcherTyping(sessionId, false);
    
    onSendMessage(sessionId, input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
    // Shift+Enter adds new line (default behavior)
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: 2,
        borderTop: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        gap: 1,
        alignItems: 'flex-end',
      }}
    >
      <TextField
        fullWidth
        multiline
        maxRows={6}
        minRows={1}
        size="small"
        placeholder="Type your response..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <IconButton 
        type="submit" 
        color="primary" 
        disabled={!input.trim() || disabled}
      >
        <SendIcon />
      </IconButton>
    </Box>
  );
}
