'use client';

import { Box, AppBar, Toolbar, Typography } from '@mui/material';
import { ChatPanel } from '../src/components/ChatPanel';
import { ControlsPanel } from '../src/components/ControlsPanel';
import { VisualizationPanel } from '../src/components/VisualizationPanel';
import { OptimizationPanel } from '../src/components/OptimizationPanel';
import { AIConnectionStatus } from '../src/components/AIConnectionStatus';

export default function HomePage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Top App Bar */}
      <AppBar position="static">
        <Toolbar>
          <Box sx={{ flex: 1 }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            AI OPTIMISM TOOLKIT
          </Typography>
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <AIConnectionStatus />
          </Box>
        </Toolbar>
      </AppBar>

      {/* 4-Panel Layout */}
      <Box
        sx={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(4, 1fr)',
          },
          gap: 2,
          p: 2,
          overflow: 'hidden',
        }}
      >
        {/* Panel 1: Chat */}
        <Box sx={{ minHeight: 400 }}>
          <ChatPanel />
        </Box>

        {/* Panel 2: Controls */}
        <Box sx={{ minHeight: 400 }}>
          <ControlsPanel />
        </Box>

        {/* Panel 3: Visualization */}
        <Box sx={{ minHeight: 400 }}>
          <VisualizationPanel />
        </Box>

        {/* Panel 4: Optimization */}
        <Box sx={{ minHeight: 400 }}>
          <OptimizationPanel />
        </Box>
      </Box>
    </Box>
  );
}
