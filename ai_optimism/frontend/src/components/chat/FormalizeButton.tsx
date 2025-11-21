'use client';

import { Box, Button, Typography, CircularProgress } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { SessionMode, Session } from '../../services/sessionManager';

interface FormalizeButtonProps {
  mode: SessionMode;
  apiKey: string | null;
  currentSession: Session | null;
  isLoading: boolean;
  isFormalizing: boolean;
  onFormalize: () => void;
}

export function FormalizeButton({
  mode,
  apiKey,
  currentSession,
  isLoading,
  isFormalizing,
  onFormalize,
}: FormalizeButtonProps) {
  // Count actual user messages to determine if there's real conversation (excluding initialization)
  const userMessageCount = currentSession?.messages.filter(m => 
    m.sender === 'user' && m.content !== 'Initialize'
  ).length || 0;
  
  // Check if AI has explicitly indicated readiness (status: 'waiting')
  // In experimental mode or when no AI is connected, AI never indicates readiness
  const aiIsReady = currentSession?.status === 'waiting' && mode === 'ai' && !!apiKey;

  // Show formalize button only if there are real user messages (not just AI greeting)
  if (userMessageCount < 1) {
    return null;
  }
  
  // Button is discouraged (grey/inherit) if AI hasn't indicated readiness
  const isPremature = !aiIsReady;

  const buttonDisabled = isLoading || isFormalizing;
  
  const buttonText = isFormalizing ? 'Formalizing Problem...' : 
                     isPremature ? '⚡ Formalize Early' : '📝 Formalize Problem';
  const buttonColor: 'primary' | 'inherit' = isPremature ? 'inherit' : 'primary';

  return (
    <Box
      sx={{
        px: 2,
        pt: 1,
        pb: 1,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'grey.50',
      }}
    >
      <Button
        fullWidth
        variant="contained"
        color={buttonColor}
        startIcon={isFormalizing ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
        onClick={onFormalize}
        disabled={buttonDisabled}
        sx={{ py: 1 }}
      >
        {buttonText}
      </Button>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        {isPremature
          ? '💬 Continue chatting - AI gathering more details'
          : '✓ Ready to formalize - AI has sufficient information'}
      </Typography>
    </Box>
  );
}
