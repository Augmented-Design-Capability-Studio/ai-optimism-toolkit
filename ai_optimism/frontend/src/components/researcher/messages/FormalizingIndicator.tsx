/**
 * Indicator shown while formalization is in progress
 */

import { Box, Avatar, Paper, Typography, CircularProgress } from '@mui/material';

export function FormalizingIndicator() {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'flex-start',
        flexDirection: 'row',
      }}
    >
      <Avatar
        sx={{
          bgcolor: 'success.main',
          width: 32,
          height: 32,
          fontSize: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        🤖
      </Avatar>
      <Paper
        elevation={1}
        sx={{
          p: 2,
          maxWidth: '70%',
          bgcolor: 'success.light',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2">
            Analyzing conversation and formalizing problem...
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

