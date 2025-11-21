'use client';

import { Box, TextField, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { SessionMode } from '../../services/sessionManager';

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export function ChatInput({ 
  input, 
  onInputChange, 
  onSubmit, 
  isLoading 
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as any);
    }
    // Shift+Enter adds new line (default behavior)
  };

  return (
    <Box
      component="form"
      onSubmit={onSubmit}
      sx={{
        p: 2,
        borderTop: 1,
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
        placeholder="Describe your optimization problem..."
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
      />
      <IconButton
        type="submit"
        color="primary"
        disabled={isLoading || !input.trim()}
      >
        <SendIcon />
      </IconButton>
    </Box>
  );
}
