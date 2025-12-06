'use client';

import { Paper, Box, Typography } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';

export function ExtractionPanel() {
  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <DescriptionIcon sx={{ color: 'primary.main' }} />
        <Typography variant="h6" fontWeight="bold">
          Text Extraction
        </Typography>
      </Box>
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Text extraction interface coming soon...
        </Typography>
      </Box>
    </Paper>
  );
}

