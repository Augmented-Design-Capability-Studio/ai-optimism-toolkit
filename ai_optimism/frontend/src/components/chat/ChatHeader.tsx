'use client';

import { Box, Typography } from '@mui/material';

interface ChatHeaderProps {
  mode?: string;
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
      <Typography variant="h6" fontWeight="bold">
        💬 Chat Assistant
      </Typography>
      <Typography variant="caption">
        We will guide you through the optimization process
      </Typography>
    </Box>
  );
}
