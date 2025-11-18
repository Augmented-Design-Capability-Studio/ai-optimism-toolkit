'use client';

import { Box, AppBar, Toolbar, Typography } from '@mui/material';
import { ChatPanel } from '../src/components/ChatPanel';
import { ControlsPanel } from '../src/components/ControlsPanel';
import { VisualizationPanel } from '../src/components/VisualizationPanel';
import { OptimizationPanel } from '../src/components/OptimizationPanel';
import { AIConnectionStatus } from '../src/components/AIConnectionStatus';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [generatedControls, setGeneratedControls] = useState<unknown>(null);

  const handleControlsGenerated = (controls: unknown) => {
    console.log('[HomePage] Controls generated:', controls);
    setGeneratedControls(controls);
  };

  // Initialize gradient visibility on mount
  useEffect(() => {
    const leftMask = document.querySelector('.gradient-left') as HTMLElement;
    if (leftMask) {
      leftMask.style.opacity = '0'; // Start with left hidden since we're at the left edge
    }
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#f5f5f5', overflow: 'hidden' }}>
      {/* Top App Bar - Fixed width, doesn't scroll */}
      <AppBar position="static" sx={{ flexShrink: 0, width: '100vw' }}>
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

      {/* 4-Panel Layout - Scrollable horizontally with gradient masks */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          minHeight: 0,
          overflow: 'hidden', // Container doesn't scroll
        }}
      >
        {/* Left gradient mask */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '120px',
            background: 'linear-gradient(to right, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0) 100%)',
            pointerEvents: 'none',
            zIndex: 2,
            transition: 'opacity 0.3s',
          }}
          className="gradient-left"
        />
        
        {/* Right gradient mask */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '120px',
            background: 'linear-gradient(to left, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0) 100%)',
            pointerEvents: 'none',
            zIndex: 2,
            transition: 'opacity 0.3s',
          }}
          className="gradient-right"
        />

        {/* Scrollable content */}
        <Box
          sx={{
            overflowX: 'auto',
            overflowY: 'hidden',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
          onScroll={(e) => {
            const target = e.currentTarget;
            const scrollLeft = target.scrollLeft;
            const maxScroll = target.scrollWidth - target.clientWidth;
            
            // Show/hide gradient masks based on scroll position
            const leftMask = document.querySelector('.gradient-left') as HTMLElement;
            const rightMask = document.querySelector('.gradient-right') as HTMLElement;
            
            if (leftMask) {
              leftMask.style.opacity = scrollLeft > 10 ? '1' : '0';
            }
            if (rightMask) {
              rightMask.style.opacity = scrollLeft < maxScroll - 10 ? '1' : '0';
            }
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: '600px 600px 600px 600px', // All panels are 600px
              },
              gap: 2,
              flex: 1,
              minHeight: 0,
              pl: 2, // Left padding
              pr: 2, // Right padding
              pt: 2, // Top padding
              pb: 2, // Bottom padding
              // Add extra width to ensure right padding is visible
              width: 'fit-content',
            }}
          >
          {/* Panel 1: Chat */}
          <Box sx={{ height: '100%', overflow: 'hidden' }}>
            <ChatPanel onControlsGenerated={handleControlsGenerated} />
          </Box>

          {/* Panel 2: Controls */}
          <Box sx={{ height: '100%', overflow: 'hidden' }}>
            <ControlsPanel controls={generatedControls} />
          </Box>

          {/* Panel 3: Visualization */}
          <Box sx={{ height: '100%', overflow: 'hidden' }}>
            <VisualizationPanel />
          </Box>

          {/* Panel 4: Optimization */}
          <Box sx={{ height: '100%', overflow: 'hidden' }}>
            <OptimizationPanel />
          </Box>
        </Box>
        </Box>
      </Box>
    </Box>
  );
}
