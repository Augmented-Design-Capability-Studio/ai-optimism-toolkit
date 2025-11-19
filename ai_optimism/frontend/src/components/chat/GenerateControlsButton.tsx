'use client';

import { Box, Button, Typography, CircularProgress, IconButton, Tooltip } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import RefreshIcon from '@mui/icons-material/Refresh';
import { SessionMode, Session } from '../../services/sessionManager';

interface GenerateControlsButtonProps {
  displayMessagesLength: number;
  mode: SessionMode;
  apiKey: string | null;
  currentSession: Session | null;
  isGenerating: boolean;
  isLoading: boolean;
  isFormalizing: boolean;
  onGenerate: () => void;
  onFormalize: () => void;
  onResetFormalization: () => void;
}

export function GenerateControlsButton({
  displayMessagesLength,
  mode,
  apiKey,
  currentSession,
  isGenerating,
  isLoading,
  isFormalizing,
  onGenerate,
  onFormalize,
  onResetFormalization,
}: GenerateControlsButtonProps) {
  if (displayMessagesLength === 0 || (mode === 'ai' && !apiKey)) {
    return null;
  }

  // Check if session has formalized message - only check status, not old messages
  // This allows re-formalization after reset
  const hasFormalization = currentSession?.status === 'formalized';
  
  // Check if AI has explicitly indicated readiness (status: 'waiting')
  const aiIsReady = currentSession?.status === 'waiting';

  // Show formalize button after 2+ messages (for both AI and Experimental mode), but with different states
  const canShowFormalize = displayMessagesLength >= 2 && !hasFormalization;
  
  // Button is discouraged (grey/inherit) if AI hasn't indicated readiness
  const isPremature = canShowFormalize && !aiIsReady;

  const buttonDisabled = isGenerating || isLoading || isFormalizing;
  
  let buttonText: string;
  let buttonAction: () => void;
  let buttonColor: 'primary' | 'secondary' | 'inherit';
  
  if (hasFormalization) {
    buttonText = isGenerating ? 'Generating Controls...' : '✨ Generate Controls Panel';
    buttonAction = onGenerate;
    buttonColor = 'secondary';
  } else {
    // Always show formalize button with state-based styling
    buttonText = isFormalizing ? 'Formalizing Problem...' : 
                 isPremature ? '⚡ Formalize Early' : '📝 Formalize Problem';
    buttonAction = onFormalize;
    // Grey/inherit color if premature, primary if AI is ready
    buttonColor = isPremature ? 'inherit' : 'primary';
  }

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
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Button
          fullWidth
          variant="contained"
          color={buttonColor}
          startIcon={isGenerating || isFormalizing ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
          onClick={buttonAction}
          disabled={buttonDisabled}
          sx={{ py: 1 }}
        >
          {buttonText}
        </Button>
        {hasFormalization && (
          <Tooltip title="Reset to refine problem definition">
            <IconButton
              onClick={onResetFormalization}
              disabled={isGenerating || isFormalizing}
              color="primary"
              sx={{ 
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                '&:hover': {
                  bgcolor: 'action.hover',
                }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        {hasFormalization
          ? 'Ready to generate controls from formalized problem'
          : isPremature
          ? '💬 Continue chatting - AI gathering more details'
          : '✓ Ready to formalize - AI has sufficient information'}
      </Typography>
    </Box>
  );
}
