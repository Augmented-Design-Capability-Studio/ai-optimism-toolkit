/**
 * Input area for researcher to send messages
 */

import { useState } from 'react';
import { Box, TextField, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

interface MessageInputProps {
  sessionId: string;
  onSendMessage: (sessionId: string, message: string) => void;
  disabled?: boolean;
}

export function MessageInput({ sessionId, onSendMessage, disabled }: MessageInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    
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
