'use client';

import { Box, Typography } from '@mui/material';
import { SessionMode } from '../../services/sessionManager';

interface ConnectionWarningProps {
  apiKey: string | null;
  mode: SessionMode;
}

export function ConnectionWarning({ apiKey, mode }: ConnectionWarningProps) {
  if (apiKey || mode !== 'ai') {
    return null;
  }

  return (
    <Box sx={{ p: 2, bgcolor: 'warning.light', textAlign: 'center' }}>
      <Typography variant="caption" color="warning.dark">
        Please configure your AI API key in the top right corner
      </Typography>
    </Box>
  );
}
