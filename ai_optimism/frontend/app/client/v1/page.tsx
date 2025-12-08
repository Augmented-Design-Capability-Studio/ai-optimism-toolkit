'use client';

import { Box } from '@mui/material';
import { ChatPanel } from '../../../src/clients/v1/components/ChatPanel';
import { ControlsPanel } from '../../../src/clients/v1/components/ControlsPanel';
import { VisualizationPanel } from '../../../src/clients/v1/components/VisualizationPanel';
import { OptimizationPanel } from '../../../src/clients/v1/components/OptimizationPanel';
import { AppBar } from '../../../src/core/components/layout/AppBar';
import { ClientAuthWrapper } from '../../../src/core/components/auth/ClientAuthWrapper';
import { VersionProvider } from '../../../src/core/contexts/VersionContext';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSessionManager, Session } from '../../../src/core/services/sessionManager';
import type { AISessionConfigStatus } from '../../../src/core/services/sessionManager';
import { aggregateControlsFromMessages } from '../../../src/clients/v1/services/controlsAggregator';

export default function ClientV1Page() {
  const [generatedControls, setGeneratedControlsState] = useState<unknown>(null);
  
  const setGeneratedControls = setGeneratedControlsState;
  const [variableValues, setVariableValues] = useState<Record<string, number>>({});
  const [optimizationData, setOptimizationData] = useState<unknown>(null);
  const [heuristicWeights, setHeuristicWeights] = useState<Record<string, Record<string, number>> | null>(null);

  const sessionManager = useSessionManager();
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  
  // Track to prevent restore from overwriting newly generated controls
  const lastExplicitControlsTimeRef = useRef<number>(0);
  const hasRestoredForSessionRef = useRef<string | null>(null);
  const hasBoundsRef = useRef<boolean>(false); // Track if controls have bounds to avoid stale closure issues

  // Load current session on mount
  // ChatPanel's useSessionLifecycle already subscribes to updates, so we'll sync via callback
  useEffect(() => {
    const loadSession = async () => {
      const session = await sessionManager.getCurrentSession();
      setCurrentSession(session);
    };
    
    loadSession();
  }, [sessionManager]);

  // Sync currentSession from ChatPanel's subscription (avoids duplicate subscriptions)
  const handleSessionUpdate = useCallback((session: Session | null) => {
    setCurrentSession(prev => {
      // No change
      if (!session && !prev) return prev;
      if (!session || !prev) return session;
      const sameId = prev.id === session.id;
      const sameUpdatedAt = prev.updatedAt === session.updatedAt;
      const sameMsgLen = (prev.messages?.length || 0) === (session.messages?.length || 0);
      const aiHash = (cfg: Session['aiConfig']) => cfg
        ? [
            cfg.status,
            cfg.provider,
            cfg.model,
            cfg.endpoint,
            cfg.setBy,
            cfg.setAt,
          ].join('|')
        : null;
      const sameAI = aiHash(prev.aiConfig) === aiHash(session.aiConfig);
      if (sameId && sameUpdatedAt && sameMsgLen && sameAI) {
        return prev;
      }
      return session;
    });
  }, []);

  // Handle lightweight AI config update (just updates aiConfig field, not whole session)
  const handleAIConfigUpdate = useCallback((sessionId: string, aiConfig: AISessionConfigStatus | null) => {
    setCurrentSession(prev => {
      if (!prev || prev.id !== sessionId) return prev;
      const prevHash = prev.aiConfig
        ? [
            prev.aiConfig.status,
            prev.aiConfig.provider,
            prev.aiConfig.model,
            prev.aiConfig.endpoint,
            prev.aiConfig.setBy,
            prev.aiConfig.setAt,
          ].join('|')
        : null;
      const nextHash = aiConfig
        ? [
            aiConfig.status,
            aiConfig.provider,
            aiConfig.model,
            aiConfig.endpoint,
            aiConfig.setBy,
            aiConfig.setAt,
          ].join('|')
        : null;
      if (prevHash === nextHash) return prev;
      return { ...prev, aiConfig };
    });
  }, []);

  // Restore controls from session messages (only on session change or initial load)
  // Also clear controls when session is terminated
  useEffect(() => {
    const timeSinceLastUpdate = Date.now() - lastExplicitControlsTimeRef.current;
    const latestMessage = currentSession?.messages?.[currentSession.messages.length - 1];
    
    if (!currentSession?.id || currentSession?.status === 'completed') {
      setGeneratedControls(null);
      setVariableValues({});
      setOptimizationData(null);
      hasRestoredForSessionRef.current = null;
      hasBoundsRef.current = false;
      return;
    }

    // Skip if already restored for this session
    if (hasRestoredForSessionRef.current === currentSession.id) {
      return;
    }

    // CRITICAL: If bounds exist, never overwrite them with restore
    // This prevents restore from running even after the 10-second window
    if (hasBoundsRef.current) {
      hasRestoredForSessionRef.current = currentSession.id; // Mark as restored to prevent future runs
      return;
    }

    // Skip if controls were just generated or updated (within last 10 seconds)
    // This prevents restore from overwriting bounds that were just added from optimization
    if (timeSinceLastUpdate < 10000) {
      return;
    }

    // Skip if the latest message is an optimization-run (doesn't contain controls)
    // This prevents aggregation from triggering when optimization completes
    if (currentSession?.messages && currentSession.messages.length > 0) {
      if (latestMessage?.metadata?.type === 'optimization-run') {
        // Check ref instead of state to avoid stale closure issues
        // The ref is set immediately when bounds are added, so it's always up-to-date
        if (hasBoundsRef.current) {
          return; // Don't trigger aggregation for optimization-run messages when bounds exist
        }
        return; // Don't trigger aggregation for optimization-run messages
      }
    }

    // Wait for messages to be available
    if (!currentSession?.messages || currentSession.messages.length === 0) {
      return;
    }

    // DEFENSIVE: If current controls have bounds, be very careful about overwriting them
    // Check if any objective has valid bounds - if so, we should preserve them aggressively
    let currentControlsHaveBounds = false;
    if (generatedControls && typeof generatedControls === 'object' && 'objectives' in generatedControls) {
      const objectives = (generatedControls as any).objectives || [];
      currentControlsHaveBounds = objectives.some((obj: any) => {
        const hasValidMin = typeof obj.min === 'number' && !isNaN(obj.min);
        const hasValidMax = typeof obj.max === 'number' && !isNaN(obj.max);
        return hasValidMin || hasValidMax;
      });
    }

    // Restore controls from messages
    const aggregatedControls = aggregateControlsFromMessages(currentSession.messages);
    if (aggregatedControls) {
      // If current controls have bounds, we MUST preserve them
      if (currentControlsHaveBounds && 'objectives' in aggregatedControls) {
        const existingObjectives = (generatedControls as any).objectives || [];
        const newObjectives = aggregatedControls.objectives || [];
        const existingBoundsMap = new Map<string, { min?: number; max?: number }>();
        
        // Collect existing bounds - only collect valid numeric bounds
        existingObjectives.forEach((obj: any) => {
          if (obj.name) {
            const hasValidMin = typeof obj.min === 'number' && !isNaN(obj.min);
            const hasValidMax = typeof obj.max === 'number' && !isNaN(obj.max);
            if (hasValidMin || hasValidMax) {
              existingBoundsMap.set(obj.name, { 
                min: hasValidMin ? obj.min : undefined, 
                max: hasValidMax ? obj.max : undefined 
              });
            }
          }
        });
        
        // Merge bounds into new objectives - ALWAYS preserve existing bounds unless new ones are explicitly provided
        if (existingBoundsMap.size > 0) {
          aggregatedControls.objectives = newObjectives.map((obj: any) => {
            const bounds = existingBoundsMap.get(obj.name);
            if (bounds) {
              // Check if new objective has valid numeric bounds (not null, not undefined, is a number)
              const hasValidMin = typeof obj.min === 'number' && !isNaN(obj.min);
              const hasValidMax = typeof obj.max === 'number' && !isNaN(obj.max);
              
              // ALWAYS use existing bounds if new ones aren't valid numbers
              return {
                ...obj,
                min: hasValidMin ? obj.min : bounds.min,
                max: hasValidMax ? obj.max : bounds.max,
              };
            }
            return obj;
          });
        }
      } else if (generatedControls && typeof generatedControls === 'object' && 'objectives' in generatedControls && 'objectives' in aggregatedControls) {
        // Fallback: preserve bounds even if currentControlsHaveBounds is false (for safety)
        const existingObjectives = (generatedControls as any).objectives || [];
        const newObjectives = aggregatedControls.objectives || [];
        const existingBoundsMap = new Map<string, { min?: number; max?: number }>();
        
        existingObjectives.forEach((obj: any) => {
          if (obj.name) {
            const hasValidMin = typeof obj.min === 'number' && !isNaN(obj.min);
            const hasValidMax = typeof obj.max === 'number' && !isNaN(obj.max);
            if (hasValidMin || hasValidMax) {
              existingBoundsMap.set(obj.name, { 
                min: hasValidMin ? obj.min : undefined, 
                max: hasValidMax ? obj.max : undefined 
              });
            }
          }
        });
        
        if (existingBoundsMap.size > 0) {
          aggregatedControls.objectives = newObjectives.map((obj: any) => {
            const bounds = existingBoundsMap.get(obj.name);
            if (bounds) {
              const hasValidMin = typeof obj.min === 'number' && !isNaN(obj.min);
              const hasValidMax = typeof obj.max === 'number' && !isNaN(obj.max);
              
              return {
                ...obj,
                min: hasValidMin ? obj.min : bounds.min,
                max: hasValidMax ? obj.max : bounds.max,
              };
            }
            return obj;
          });
        }
      }
      
      // If we're setting controls with bounds, update the ref
      const hasBounds = aggregatedControls.objectives?.some((obj: any) => {
        const hasValidMin = typeof obj.min === 'number' && !isNaN(obj.min);
        const hasValidMax = typeof obj.max === 'number' && !isNaN(obj.max);
        return hasValidMin || hasValidMax;
      });
      
      if (hasBounds) {
        hasBoundsRef.current = true;
      }
      
      setGeneratedControls(aggregatedControls);
      hasRestoredForSessionRef.current = currentSession.id;
    }
  }, [currentSession?.id, currentSession?.status, currentSession?.messages?.length]);

  // Track last controls to prevent duplicate processing
  const lastProcessedControlsRef = useRef<string>('');
  
  const handleControlsGenerated = (controls: unknown) => {
    // Create a hash of the controls to detect duplicates
    const controlsHash = JSON.stringify((controls as any)?.objectives?.map((o: any) => ({ name: o.name, expression: o.expression })));
    
    // Skip if this is a duplicate call with the same controls
    if (lastProcessedControlsRef.current === controlsHash && hasBoundsRef.current) {
      return;
    }
    lastProcessedControlsRef.current = controlsHash;
    
    // CRITICAL: If bounds exist (tracked by ref), we MUST preserve them
    // Use a functional update to get the latest state, avoiding stale closure issues
    if (hasBoundsRef.current && controls && typeof controls === 'object' && 'objectives' in controls) {
      setGeneratedControls((prevControls: unknown) => {
        if (prevControls && typeof prevControls === 'object' && 'objectives' in prevControls) {
          const existingObjectives = (prevControls as any).objectives || [];
          const newObjectives = (controls as any).objectives || [];
          const existingBoundsMap = new Map<string, { min?: number; max?: number }>();
          
          // Collect existing bounds from the latest state
          existingObjectives.forEach((obj: any) => {
            if (obj.name) {
              const hasValidMin = typeof obj.min === 'number' && !isNaN(obj.min);
              const hasValidMax = typeof obj.max === 'number' && !isNaN(obj.max);
              if (hasValidMin || hasValidMax) {
                existingBoundsMap.set(obj.name, { 
                  min: hasValidMin ? obj.min : undefined, 
                  max: hasValidMax ? obj.max : undefined 
                });
              }
            }
          });
          
          // Merge bounds into new objectives
          if (existingBoundsMap.size > 0) {
            const updatedObjectives = newObjectives.map((obj: any) => {
              const bounds = existingBoundsMap.get(obj.name);
              if (bounds) {
                const hasValidMin = typeof obj.min === 'number' && !isNaN(obj.min);
                const hasValidMax = typeof obj.max === 'number' && !isNaN(obj.max);
                
                return {
                  ...obj,
                  min: hasValidMin ? obj.min : bounds.min,
                  max: hasValidMax ? obj.max : bounds.max,
                };
              }
              return obj;
            });
            return { ...(controls as any), objectives: updatedObjectives };
          }
        }
        // Fallback: if we can't preserve, just use new controls (but this shouldn't happen)
        return controls;
      });
    } else {
      // No bounds exist, just set the controls normally
      setGeneratedControls(controls);
    }
    
    lastExplicitControlsTimeRef.current = Date.now();
    // Note: ChatPanel already saves controls to session with the message
  };

  const handleControlsUpdate = (updatedControls: unknown) => {
    setGeneratedControls(updatedControls);
    lastExplicitControlsTimeRef.current = Date.now();
  };

  const handleOptimizationResults = (results: any[], fullData?: any) => {
    // Use best_design from fullData if available, otherwise use first result
    const bestSolution = fullData?.best_design?.variables || (results && results.length > 0 ? results[0].variables : null);
    
    if (bestSolution) {
      
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
      
      // Always create a new object to ensure React detects the change
      setVariableValues({ ...convertedValues });
    }

    if (fullData) {
      setOptimizationData(fullData);
      
      // Merge objective bounds into controls if available
      if (fullData?.objective_bounds && generatedControls && typeof generatedControls === 'object' && 'objectives' in generatedControls) {
        const updatedControls = { ...generatedControls };
        const objectives = [...(updatedControls as any).objectives || []];
        const bounds = fullData.objective_bounds;
        
        // Update each objective with its bounds
        for (let i = 0; i < objectives.length; i++) {
          const obj = objectives[i];
          if (obj.name && bounds[obj.name]) {
            objectives[i] = {
              ...obj,
              // Preserve existing bounds if they exist, otherwise use new ones
              min: bounds[obj.name].min !== undefined && bounds[obj.name].min !== null ? bounds[obj.name].min : obj.min,
              max: bounds[obj.name].max !== undefined && bounds[obj.name].max !== null ? bounds[obj.name].max : obj.max,
            };
          }
        }
        
        (updatedControls as any).objectives = objectives;
        setGeneratedControls(updatedControls);
        // Update timestamp to prevent restore from overwriting these bounds
        lastExplicitControlsTimeRef.current = Date.now();
        // Set ref to indicate bounds exist (avoids stale closure issues)
        hasBoundsRef.current = true;
      }
      
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
    setHeuristicWeights(weights);
  };

  return (
    <ClientAuthWrapper>
      {(handleLogout) => (
        <VersionProvider version="v1">
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#f5f5f5', overflow: 'hidden' }}>
            <AppBar 
              title="AI OPTIMISM TOOLKIT"
              color="#1976d2"
              currentSession={currentSession}
              onLogout={handleLogout}
              onAIConfigUpdate={handleAIConfigUpdate}
            />

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
                    <ChatPanel 
                      key={currentSession?.id || 'no-session'} 
                      onControlsGenerated={handleControlsGenerated}
                      onSessionUpdate={handleSessionUpdate}
                    />
                  </Box>

                  <Box sx={{ height: '100%', overflow: 'hidden' }}>
                    <ControlsPanel 
                      key={`controls-${currentSession?.id || 'no-session'}`}
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
          </Box>
        </VersionProvider>
      )}
    </ClientAuthWrapper>
  )
}

