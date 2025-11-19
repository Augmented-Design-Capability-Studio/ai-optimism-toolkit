'use client';

import { Box, Typography } from '@mui/material';
import { SessionMode } from '../../services/sessionManager';

interface ChatHeaderProps {
  mode: SessionMode;
}

export function ChatHeader({ mode }: ChatHeaderProps) {
  return (
    <Box
      sx={{
        p: 2,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" fontWeight="bold">
          💬 Chat Assistant
        </Typography>
      </Box>
      
      <Typography variant="caption">
        Describe your optimization problem and get help formalizing it
      </Typography>
    </Box>
  );
}
