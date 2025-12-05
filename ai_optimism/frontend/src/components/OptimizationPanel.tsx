'use client';

import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Stack,
  Divider,
  TextField,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import InfoIcon from '@mui/icons-material/Info';
import { useState, type ChangeEvent } from 'react';
import { useBackend } from '../contexts/BackendContext';
import { useSessionManager } from '../services/sessionManager';
import type { Controls } from './controls/types';
import { Session } from '../services/sessionManager';

type OptimizationStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

interface OptimizationResult {
  variables: Record<string, number>;
  score: number;
  objectives: Record<string, number>;
}

interface OptimizationPanelProps {
  controls?: Controls;
  onStart?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  onResultsUpdate?: (results: OptimizationResult[], fullData?: any) => void;
  sessionId?: string | null;  // Optional session ID to link optimization to session
  heuristicWeights?: Record<string, Record<string, number>> | null;  // Heuristic weights from HeuristicNetwork
}

export function OptimizationPanel({ controls, onStart, onPause, onStop, onReset, onResultsUpdate, sessionId, heuristicWeights }: OptimizationPanelProps) {
  const sessionManager = useSessionManager();
  const [status, setStatus] = useState<OptimizationStatus>('idle');
  const [iteration, setIteration] = useState(0);
  const [maxIterations, setMaxIterations] = useState(100);
  const [maxIterationsInput, setMaxIterationsInput] = useState<string>('100');
  const [populationSize, setPopulationSize] = useState(50);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<OptimizationResult[]>([]);
  const [logsExpanded, setLogsExpanded] = useState(false);

  const { backendApi } = useBackend();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleStart = async () => {
    if (!controls || !controls.variables || controls.variables.length === 0) {
      addLog('❌ Error: No variables defined');
      setStatus('error');
      return;
    }

    if (!controls.objectives || controls.objectives.length === 0) {
      addLog('❌ Error: No objectives defined');
      setStatus('error');
      return;
    }

    setStatus('running');
    addLog('🚀 Starting optimization...');
    onStart?.();

    try {
      // Get current session ID if not provided
      const currentSessionId = sessionId || (await sessionManager.getCurrentSession())?.id || null;
      
      // Step 1: Create optimization problem
      addLog('📝 Creating optimization problem...');
      const problemUrl = currentSessionId 
        ? `${backendApi.optimization.createProblem}?session_id=${encodeURIComponent(currentSessionId)}`
        : backendApi.optimization.createProblem;
      
      // Ensure constraints include type and weight fields explicitly
      // This ensures the backend receives the constraint type and weight even if they're undefined in the original object
      const constraintsWithDefaults = (controls.constraints || []).map((constraint, idx) => {
        // Preserve the actual type if set, otherwise default to 'hard'
        const constraintType = constraint.type !== undefined ? constraint.type : 'hard';
        
        const result: any = {
          expression: constraint.expression,
          description: constraint.description,
          title: constraint.title || `Constraint ${idx + 1}`,
          type: constraintType, // Always include type explicitly
        };
        
        // For soft constraints, always include weight (backend defaults to 10.0 if not provided)
        if (constraintType === 'soft') {
          result.weight = constraint.weight !== undefined ? constraint.weight : 10.0;
        }
        
        console.log(`[OptimizationPanel] Constraint ${idx + 1}:`, {
          original: constraint,
          processed: result,
        });
        
        return result;
      });

      const problemPayload = {
        name: 'Web Optimization',
        description: 'Optimization from web interface',
        variables: controls.variables,
        objectives: controls.objectives,
        properties: controls.properties || [],
        constraints: constraintsWithDefaults,
      };

      console.log('[OptimizationPanel] Full optimization problem payload:', JSON.stringify(problemPayload, null, 2));

      const problemResponse = await fetch(problemUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(problemPayload),
      });

      if (!problemResponse.ok) {
        throw new Error(`Failed to create problem: ${problemResponse.statusText}`);
      }

      const problemData = await problemResponse.json();
      const problemId = problemData.id;
      addLog(`✅ Problem created with ID: ${problemId}`);

      // Step 2: Execute optimization
      addLog(`⚙️ Running optimization (${maxIterations} iterations, population: ${populationSize})...`);
      setIteration(0);

      // Use heuristic weights from HeuristicNetwork if available
      // These are user-edited weights from the visualization panel
      
      // Store the full optimization packet for later use
      const optimizationPacket = {
        problem: {
          id: problemId,
          name: 'Web Optimization',
          description: 'Optimization from web interface',
          variables: controls.variables,
          objectives: controls.objectives,
          properties: controls.properties || [],
          constraints: controls.constraints || [],
        },
        config: {
          problem_id: problemId,
          population_size: populationSize,
          max_iterations: maxIterations,
          convergence_threshold: 0.001,
          session_id: currentSessionId,
          heuristic_weights: heuristicWeights,
        },
      };
      
      const executeResponse = await fetch(backendApi.optimization.execute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(optimizationPacket.config),
      });

      if (!executeResponse.ok) {
        throw new Error(`Optimization failed: ${executeResponse.statusText}`);
      }

      const executeData = await executeResponse.json();
      addLog(`✅ Optimization completed!`);

      // Update results
      if (executeData.results && executeData.results.length > 0) {
        setResults(executeData.results);
        setBestScore(executeData.results[0].score);
        setIteration(maxIterations);
        addLog(`🎯 Best score: ${executeData.results[0].score.toFixed(4)}`);
        addLog(`📊 Found ${executeData.results.length} solutions`);

        // Notify parent component with both results and full data (includes heuristic_map)
        onResultsUpdate?.(executeData.results, executeData);

        // Create optimization run message bubble if we have a session
        if (currentSessionId && executeData.run_id) {
          try {
            const bestDesign = executeData.best_design || executeData.results[0];
            const messageContent = `Optimization completed successfully!\n\n` +
              `Best Score: ${bestDesign.score.toFixed(6)}\n` +
              `Population Size: ${populationSize}\n` +
              `Max Iterations: ${maxIterations}\n` +
              `Solutions Found: ${executeData.results.length}\n\n` +
              `Run ID: ${executeData.run_id}`;

            await sessionManager.addMessage(
              currentSessionId,
              'ai',
              messageContent,
              {
                type: 'optimization-run',
                runId: executeData.run_id,
                status: 'completed',
                bestScore: bestDesign.score,
                results: executeData.results,
                config: {
                  population_size: populationSize,
                  max_iterations: maxIterations,
                },
                optimizationPacket: optimizationPacket, // Store full packet sent to server
                heuristic_map: executeData.heuristic_map, // Store heuristic map if available
              }
            );
          } catch (error) {
            console.error('[OptimizationPanel] Error creating optimization message:', error);
            // Don't fail the optimization if message creation fails
          }
        }
      }

      setStatus('completed');
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      setStatus('error');
    }
  };

  const handlePause = () => {
    setStatus('paused');
    addLog('⏸️ Optimization paused');
    onPause?.();
  };

  const handleStop = () => {
    setStatus('idle');
    addLog('⏹️ Optimization stopped');
    onStop?.();
  };

  const handleReset = () => {
    setStatus('idle');
    setIteration(0);
    setMaxIterations(100);
    setMaxIterationsInput('100');
    setBestScore(null);
    setLogs([]);
    setResults([]);
    onReset?.();
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'success';
      case 'paused':
        return 'warning';
      case 'completed':
        return 'info';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Paper
      elevation={4}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          borderTop: '3px solid',
          borderTopColor: 'success.main',
          bgcolor: 'white',
          color: 'text.primary',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
        <Typography variant="h6" fontWeight="bold">
          ⚡ Optimization
        </Typography>
        <Typography variant="caption">
          Status & monitoring
        </Typography>
        </Box>
        {bestScore !== null && (
          <Box
            sx={{
              textAlign: 'right',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Best Score
              </Typography>
              <Tooltip title="Weighted sum of objective scores. Each objective is normalized to 0-1, then multiplied by its weight. Hard constraints: weight 100000, soft constraints: user-specified weight, objectives: user-specified weight (default 1.0). Higher is better.">
                <InfoIcon sx={{ fontSize: 14, color: 'text.secondary', cursor: 'help' }} />
              </Tooltip>
            </Box>
            <Typography variant="h6" color="success.main" fontWeight="bold">
              {bestScore.toFixed(4)}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontSize="0.65rem">
              (normalized)
            </Typography>
          </Box>
        )}
      </Box>

      {/* Status - Scrollable content area */}
      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto', 
        overflowX: 'hidden', 
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0, // Important for flex scrolling
      }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Status:</Typography>
          <Chip
            label={status.toUpperCase()}
            color={getStatusColor()}
            size="small"
          />
        </Stack>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2">
                Iteration: {iteration} /
              </Typography>
              <TextField
                variant="standard"
                type="number"
                value={maxIterationsInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setMaxIterationsInput(e.target.value);
                }}
                onBlur={(e: ChangeEvent<HTMLInputElement>) => {
                  const parsed = parseInt(e.target.value);
                  if (!isNaN(parsed) && parsed >= 1) {
                    setMaxIterations(parsed);
                    setMaxIterationsInput(parsed.toString());
                  } else if (e.target.value === '') {
                    // Keep empty temporarily, but set to 1 on blur if still empty
                    setMaxIterations(1);
                    setMaxIterationsInput('1');
                  } else {
                    // Invalid input, reset to last valid value
                    setMaxIterationsInput(maxIterations.toString());
                  }
                }}
                disabled={status === 'running'}
                inputProps={{
                  style: {
                    padding: 0,
                    width: 50,
                    textAlign: 'center',
                    fontSize: '0.875rem'
                  }
                }}
              />
            </Box>
            <Typography variant="body2">
              {maxIterations > 0 ? ((iteration / maxIterations) * 100).toFixed(0) : 0}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(iteration / maxIterations) * 100}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>

        {/* Solutions Display */}
        {results.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                🏆 Solutions ({results.length})
              </Typography>
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={() => onResultsUpdate?.(results)}
                sx={{ fontSize: '0.75rem', py: 0.5 }}
              >
                Apply Best
              </Button>
            </Box>
            
            {results.length === 1 ? (
              // Single solution - show as before
            <Box
              sx={{
                p: 1.5,
                bgcolor: 'grey.100',
                borderRadius: 1,
                  maxHeight: '25vh',
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
            >
              {Object.entries(results[0].variables).map(([key, value]) => {
                // For categorical variables, display category name if available
                let displayValue = typeof value === 'number' ? value.toFixed(2) : String(value);
                if (controls && typeof controls === 'object' && 'variables' in controls) {
                  const vars = (controls as any).variables || [];
                  const varDef = vars.find((v: any) => v.name === key);
                  if (varDef?.type === 'categorical' && varDef.categories) {
                    if (typeof value === 'string') {
                      // Already a category name from backend
                      displayValue = value;
                    } else if (typeof value === 'number') {
                      // Convert index to category name for display
                      const idx = Math.round(value);
                      if (idx >= 0 && idx < varDef.categories.length) {
                        displayValue = varDef.categories[idx];
                      }
                    }
                  }
                }
                
                return (
                  <Box
                    key={key}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      py: 0.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Typography variant="body2" fontWeight="medium" sx={{ flex: 1, mr: 1 }}>
                      {key}:
                    </Typography>
                    <Typography variant="body2" color="primary" sx={{ flex: 1, textAlign: 'right' }}>
                      {displayValue}
                    </Typography>
                  </Box>
                );
              })}
                {results[0].objectives && Object.keys(results[0].objectives).length > 0 && (
                  <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                      Objectives:
                    </Typography>
                    {Object.entries(results[0].objectives).map(([objName, objScore]) => (
                      <Typography key={objName} variant="caption" display="block">
                        {objName}: {typeof objScore === 'number' ? objScore.toFixed(4) : objScore}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            ) : (
              // Multiple solutions - use accordion
              <Box sx={{ maxHeight: '35vh', overflowY: 'auto' }}>
                {results.map((result, idx) => (
                  <Accordion key={idx} defaultExpanded={idx === 0} sx={{ mb: 0.5 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                        <Typography variant="body2" fontWeight="medium">
                          Solution #{idx + 1}
                        </Typography>
                        <Typography variant="body2" color="primary">
                          Score: {result.score.toFixed(4)}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                        {Object.entries(result.variables).map(([key, value]) => {
                          // For categorical variables, display category name if available
                          let displayValue = typeof value === 'number' ? value.toFixed(2) : String(value);
                          if (controls && typeof controls === 'object' && 'variables' in controls) {
                            const vars = (controls as any).variables || [];
                            const varDef = vars.find((v: any) => v.name === key);
                            if (varDef?.type === 'categorical' && varDef.categories) {
                              if (typeof value === 'string') {
                                displayValue = value;
                              } else if (typeof value === 'number') {
                                const idx = Math.round(value);
                                if (idx >= 0 && idx < varDef.categories.length) {
                                  displayValue = varDef.categories[idx];
                                }
                              }
                            }
                          }
                          
                          return (
                            <Box
                              key={key}
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                py: 0.5,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                '&:last-child': { borderBottom: 'none' },
                              }}
                            >
                              <Typography variant="body2" fontWeight="medium" sx={{ flex: 1, mr: 1 }}>
                                {key}:
                              </Typography>
                              <Typography variant="body2" color="primary" sx={{ flex: 1, textAlign: 'right' }}>
                                {displayValue}
                              </Typography>
                            </Box>
                          );
                        })}
                        {result.objectives && Object.keys(result.objectives).length > 0 && (
                          <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                              Objectives:
                            </Typography>
                            {Object.entries(result.objectives).map(([objName, objScore]) => (
                              <Typography key={objName} variant="caption" display="block">
                                {objName}: {typeof objScore === 'number' ? objScore.toFixed(4) : objScore}
                              </Typography>
                            ))}
                          </Box>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => onResultsUpdate?.([result])}
                          sx={{ mt: 1, fontSize: '0.7rem' }}
                          fullWidth
                        >
                          Apply This Solution
                        </Button>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
            </Box>
            )}
          </Box>
        )}

        <Divider />
      </Box>

      {/* Controls - Fixed at bottom */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}>
        <Stack direction="row" spacing={1}>
          {status === 'idle' || status === 'paused' || status === 'completed' ? (
            <Button
              variant="contained"
              color="success"
              startIcon={<PlayArrowIcon />}
              onClick={handleStart}
              fullWidth
            >
              {status === 'paused' ? 'Resume' : 'Start'}
            </Button>
          ) : (
            <Button
              variant="contained"
              color="warning"
              startIcon={<PauseIcon />}
              onClick={handlePause}
              fullWidth
            >
              Pause
            </Button>
          )}
          <Button
            variant="outlined"
            color="error"
            startIcon={<StopIcon />}
            onClick={handleStop}
            disabled={status === 'idle'}
          >
            Stop
          </Button>
          <Button
            variant="outlined"
            startIcon={<RestartAltIcon />}
            onClick={handleReset}
          >
            Reset
          </Button>
        </Stack>
      </Box>

      <Divider />

      {/* Logs - Collapsible */}
      <Box sx={{ borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}>
        <Box
          sx={{
            p: 1.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          onClick={() => setLogsExpanded(!logsExpanded)}
        >
          <Typography variant="subtitle2">
            📋 Logs {logs.length > 0 && `(${logs.length})`}
        </Typography>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setLogsExpanded(!logsExpanded); }}>
            {logsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
        {logsExpanded ? (
        <Box
          sx={{
            fontFamily: 'monospace',
            fontSize: 12,
            bgcolor: 'grey.100',
            p: 1,
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {logs.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              No logs yet. Start optimization to see progress.
            </Typography>
          ) : (
              logs.map((log, idx) => (
              <Box key={idx} sx={{ mb: 0.5 }}>
                {log}
              </Box>
            ))
          )}
        </Box>
        ) : (
          logs.length > 0 && (
            <Box
              sx={{
                px: 1.5,
                pb: 1.5,
                fontFamily: 'monospace',
                fontSize: 11,
                color: 'text.secondary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {logs[logs.length - 1]}
            </Box>
          )
        )}
      </Box>
    </Paper>
  );
}
