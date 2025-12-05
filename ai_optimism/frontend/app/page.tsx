'use client';

import { Box, AppBar, Toolbar, Typography, Button } from '@mui/material';
import { ChatPanel } from '../src/components/ChatPanel';
import { ControlsPanel } from '../src/components/ControlsPanel';
import { VisualizationPanel } from '../src/components/VisualizationPanel';
import { OptimizationPanel } from '../src/components/OptimizationPanel';
import { SessionAIStatusIndicator, SessionAISettings, BackendStatusIndicator, BackendSettings } from '../src/components/shared';
import { ClientAuthWrapper } from '../src/components/ClientAuthWrapper';
import { useState, useEffect, useRef } from 'react';
import { useSessionManager, Session } from '../src/services/sessionManager';
import { aggregateControlsFromMessages } from '../src/services/controlsAggregator';

export default function HomePage() {
  const [generatedControls, setGeneratedControls] = useState<unknown>(null);
  const [variableValues, setVariableValues] = useState<Record<string, number>>({});
  const [optimizationData, setOptimizationData] = useState<unknown>(null);
  const [heuristicWeights, setHeuristicWeights] = useState<Record<string, Record<string, number>> | null>(null);
  const [backendSettingsOpen, setBackendSettingsOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);

  const sessionManager = useSessionManager();
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  
  // Track to prevent restore from overwriting newly generated controls
  const lastExplicitControlsTimeRef = useRef<number>(0);
  const hasRestoredForSessionRef = useRef<string | null>(null);

  // Load and monitor current session
  // Use ref to track previous session to avoid unnecessary state updates
  const prevSessionRef = useRef<Session | null>(null);
  
  useEffect(() => {
    const loadSession = async () => {
      const session = await sessionManager.getCurrentSession();
      // Only update state if session actually changed (by ID or key properties)
      if (!prevSessionRef.current || 
          prevSessionRef.current.id !== session?.id ||
          prevSessionRef.current.status !== session?.status ||
          prevSessionRef.current.messages?.length !== session?.messages?.length) {
        prevSessionRef.current = session;
        setCurrentSession(session);
      }
    };
    
    loadSession();
    const interval = setInterval(loadSession, 2000);
    return () => clearInterval(interval);
  }, [sessionManager]);

  // Restore controls from session messages (only on session change or initial load)
  // Also clear controls when session is terminated
  useEffect(() => {
    if (!currentSession?.id || currentSession?.status === 'completed') {
      setGeneratedControls(null);
      setVariableValues({});
      setOptimizationData(null);
      hasRestoredForSessionRef.current = null;
      return;
    }

    // Skip if already restored for this session
    if (hasRestoredForSessionRef.current === currentSession.id) {
      return;
    }

    // Skip if controls were just generated (within last 3 seconds)
    if (Date.now() - lastExplicitControlsTimeRef.current < 3000) {
      return;
    }

    // Wait for messages to be available
    if (!currentSession?.messages || currentSession.messages.length === 0) {
      return;
    }

    // Restore controls from messages
    const aggregatedControls = aggregateControlsFromMessages(currentSession.messages);
    if (aggregatedControls) {
      console.log('[HomePage] Restoring controls from session:', aggregatedControls);
      setGeneratedControls(aggregatedControls);
      hasRestoredForSessionRef.current = currentSession.id;
    }
  }, [currentSession?.id, currentSession?.status, currentSession?.messages?.length]);

  const handleControlsGenerated = (controls: unknown) => {
    console.log('[HomePage] Controls generated:', controls);
    setGeneratedControls(controls);
    lastExplicitControlsTimeRef.current = Date.now();
    // Note: ChatPanel already saves controls to session with the message
  };

  const handleControlsUpdate = (updatedControls: unknown) => {
    console.log('[HomePage] Controls updated from ControlsPanel:', updatedControls);
    setGeneratedControls(updatedControls);
    lastExplicitControlsTimeRef.current = Date.now();
  };

  const handleOptimizationResults = (results: any[], fullData?: any) => {
    // Use best_design from fullData if available, otherwise use first result
    const bestSolution = fullData?.best_design?.variables || (results && results.length > 0 ? results[0].variables : null);
    
    if (bestSolution) {
      console.log('[HomePage] Applying optimization results:', bestSolution);
      
      // Convert categorical category names to indices for the frontend
      const convertedValues: Record<string, number> = {};
      if (generatedControls && typeof generatedControls === 'object' && 'variables' in generatedControls) {
        const vars = (generatedControls as any).variables || [];
        for (const [varName, value] of Object.entries(bestSolution)) {
          const varDef = vars.find((v: any) => v.name === varName);
          if (varDef?.type === 'categorical' && varDef.categories) {
            // Check if value is a category name (string) and convert to index
            if (typeof value === 'string') {
              const idx = varDef.categories.indexOf(value);
              convertedValues[varName] = idx >= 0 ? idx : 0;
            } else if (typeof value === 'number') {
              // Already an index, use it directly (ensure it's within bounds)
              convertedValues[varName] = Math.max(0, Math.min(Math.floor(value), varDef.categories.length - 1));
            } else {
              convertedValues[varName] = 0;
            }
          } else {
            convertedValues[varName] = value as number;
          }
        }
      } else {
        // Fallback: use values as-is
        Object.assign(convertedValues, bestSolution);
      }
      
      console.log('[HomePage] Converted values for control panel:', convertedValues);
      // Always create a new object to ensure React detects the change
      setVariableValues({ ...convertedValues });
    }

    if (fullData) {
      console.log('[HomePage] Storing optimization data:', fullData);
      setOptimizationData(fullData);
      // Initialize heuristic weights from the optimization data if available
      // but don't overwrite user-edited weights (only initialize if null)
      setHeuristicWeights(prev => {
        if (fullData?.heuristic_map?.weights && !prev) {
          return fullData.heuristic_map.weights;
        }
        return prev;
      });
    }
  };

  const handleWeightsChange = (weights: Record<string, Record<string, number>>) => {
    console.log('[HomePage] Heuristic weights changed:', weights);
    setHeuristicWeights(weights);
  };

  return (
    <ClientAuthWrapper>
      {(handleLogout) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#f5f5f5', overflow: 'hidden' }}>
          <AppBar 
            position="static" 
            sx={{ 
              flexShrink: 0, 
              width: '100vw',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <Toolbar>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5, py: 1 }}>
                {currentSession && (
                  <>
                    <SessionAIStatusIndicator 
                      sessionId={currentSession.id} 
                      mode={currentSession.mode}
                      onClick={() => setAiSettingsOpen(true)}
                    />
                    <SessionAISettings
                      open={aiSettingsOpen}
                      sessionId={currentSession.id}
                      onClose={() => setAiSettingsOpen(false)}
                    />
                  </>
                )}
                <BackendStatusIndicator onClick={() => setBackendSettingsOpen(true)} />
              </Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'white' }}>
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
                  sx={{ 
                    color: 'white', 
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  Logout
                </Button>
              </Box>
            </Toolbar>
          </AppBar>

          <Box sx={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
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
                const leftMask = document.querySelector('.gradient-left') as HTMLElement;
                const rightMask = document.querySelector('.gradient-right') as HTMLElement;
                if (leftMask) leftMask.style.opacity = scrollLeft > 10 ? '1' : '0';
                if (rightMask) rightMask.style.opacity = scrollLeft < maxScroll - 10 ? '1' : '0';
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '600px 600px 600px 600px',
                  gap: 2,
                  flex: 1,
                  minHeight: 0,
                  pl: 2,
                  pr: 2,
                  pt: 2,
                  pb: 2,
                  width: 'fit-content',
                }}
              >
                <Box sx={{ height: '100%', overflow: 'hidden' }}>
                  <ChatPanel key={currentSession?.id || 'no-session'} onControlsGenerated={handleControlsGenerated} />
                </Box>

                <Box sx={{ height: '100%', overflow: 'hidden' }}>
                  <ControlsPanel 
                    controls={generatedControls} 
                    initialValues={variableValues}
                    onControlsUpdate={handleControlsUpdate}
                    onClearControls={() => {
                      setGeneratedControls(null);
                      setVariableValues({});
                    }}
                  />
                </Box>

                <Box sx={{ height: '100%', overflow: 'hidden' }}>
                  <VisualizationPanel 
                    data={optimizationData} 
                    onWeightsChange={handleWeightsChange}
                  />
                </Box>

                <Box sx={{ height: '100%', overflow: 'hidden' }}>
                  <OptimizationPanel
                    controls={generatedControls as any}
                    onResultsUpdate={handleOptimizationResults}
                    sessionId={currentSession?.id}
                    heuristicWeights={heuristicWeights}
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
