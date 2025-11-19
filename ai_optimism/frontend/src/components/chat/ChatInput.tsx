'use client';

import { Box, TextField, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { SessionMode } from '../../services/sessionManager';

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  mode: SessionMode;
  apiKey: string | null;
}

export function ChatInput({ 
  input, 
  onInputChange, 
  onSubmit, 
  isLoading, 
  mode, 
  apiKey 
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
        placeholder={
          mode === 'experimental' 
            ? 'Describe your problem...'
            : 'Describe your optimization problem...'
        }
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading || (mode === 'ai' && !apiKey)}
      />
      <IconButton
        type="submit"
        color="primary"
        disabled={isLoading || !input.trim() || (mode === 'ai' && !apiKey)}
      >
        <SendIcon />
      </IconButton>
    </Box>
  );
}
