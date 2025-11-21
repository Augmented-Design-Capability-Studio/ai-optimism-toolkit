'use client';

import { Box, AppBar, Toolbar, Typography, Button } from '@mui/material';
import { ChatPanel } from '../src/components/ChatPanel';
import { ControlsPanel } from '../src/components/ControlsPanel';
import { VisualizationPanel } from '../src/components/VisualizationPanel';
import { OptimizationPanel } from '../src/components/OptimizationPanel';
import { AIConnectionStatus } from '../src/components/AIConnectionStatus';
import { BackendStatusIndicator } from '../src/components/BackendStatusIndicator';
import { BackendSettings } from '../src/components/BackendSettings';
import { ClientAuthWrapper } from '../src/components/ClientAuthWrapper';
import { useState, useEffect } from 'react';
import { useAIProvider } from '../src/contexts/AIProviderContext';
import { useSessionManager, Session } from '../src/services/sessionManager';

export default function HomePage() {
  const [generatedControls, setGeneratedControls] = useState<unknown>(null);
  const [variableValues, setVariableValues] = useState<Record<string, number>>({});
  const [optimizationData, setOptimizationData] = useState<unknown>(null);
  const [backendSettingsOpen, setBackendSettingsOpen] = useState(false);

  const { state } = useAIProvider();
  const { apiKey } = state;
  const sessionManager = useSessionManager();
  const [currentSession, setCurrentSession] = useState<Session | null>(null);

  // Load and monitor current session
  useEffect(() => {
    const loadSession = async () => {
      const session = await sessionManager.getCurrentSession();
      setCurrentSession(session);
    };
    
    loadSession();
    
    // Poll for session changes every 2 seconds
    const interval = setInterval(loadSession, 2000);
    
    return () => clearInterval(interval);
  }, [sessionManager]);

  const handleControlsGenerated = (controls: unknown) => {
    console.log('[HomePage] Controls generated:', controls);
    setGeneratedControls(controls);
  };

  const handleOptimizationResults = (results: any[], fullData?: any) => {
    if (results && results.length > 0) {
      // Apply best result to variable values
      const bestSolution = results[0].variables;
      console.log('[HomePage] Applying optimization results:', bestSolution);
      setVariableValues(bestSolution);
    }

    // Store full optimization data (includes heuristic_map)
    if (fullData) {
      console.log('[HomePage] Storing optimization data:', fullData);
      setOptimizationData(fullData);
    }
  };

  // Initialize gradient visibility on mount
  useEffect(() => {
    const leftMask = document.querySelector('.gradient-left') as HTMLElement;
    if (leftMask) {
      leftMask.style.opacity = '0'; // Start with left hidden since we're at the left edge
    }
  }, []);

  return (
    <ClientAuthWrapper>
      {(handleLogout) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#f5f5f5', overflow: 'hidden' }}>
          {/* Top App Bar - Fixed width, doesn't scroll */}
          <AppBar position="static" sx={{ flexShrink: 0, width: '100vw' }}>
            <Toolbar>

              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5, py: 1 }}>
                <AIConnectionStatus />
                <BackendStatusIndicator onClick={() => setBackendSettingsOpen(true)} />
              </Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                AI OPTIMISM TOOLKIT
              </Typography>
              <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                {currentSession && (
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    Session: {currentSession.id}
                  </Typography>
                )}
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={handleLogout}
                  sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.3)' }}
                >
                  Logout
                </Button>
              </Box>
            </Toolbar>
          </AppBar>

          {/* Content area with panels and gradient masks */}
          <Box sx={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
            {/* Left gradient mask */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: '150px',
                background: 'linear-gradient(to right, rgba(0, 0, 0, 0.2) 0%, rgba(255, 255, 255, 0) 100%)',
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
                width: '150px',
                background: 'linear-gradient(to left, rgba(0, 0, 0, 0.2) 0%, rgba(255, 255, 255, 0) 100%)',
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
                  gridTemplateColumns: '600px 600px 600px 600px', // Always horizontal layout
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
                  <ChatPanel key={apiKey} onControlsGenerated={handleControlsGenerated} />
                </Box>

                {/* Panel 2: Controls */}
                <Box sx={{ height: '100%', overflow: 'hidden' }}>
                  <ControlsPanel controls={generatedControls} initialValues={variableValues} />
                </Box>

                {/* Panel 3: Visualization */}
                <Box sx={{ height: '100%', overflow: 'hidden' }}>
                  <VisualizationPanel data={optimizationData} />
                </Box>

                {/* Panel 4: Optimization */}
                <Box sx={{ height: '100%', overflow: 'hidden' }}>
                  <OptimizationPanel
                    controls={generatedControls as any}
                    onResultsUpdate={handleOptimizationResults}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
          <BackendSettings
            open={backendSettingsOpen}
            onClose={() => setBackendSettingsOpen(false)}
          />
        </Box>
      )}
    </ClientAuthWrapper>
  )
}