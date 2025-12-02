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
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
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
  const [populationSize, setPopulationSize] = useState(50);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<OptimizationResult[]>([]);

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
      
      const problemResponse = await fetch(problemUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Web Optimization',
          description: 'Optimization from web interface',
          variables: controls.variables,
          objectives: controls.objectives,
          properties: controls.properties || [],
          constraints: controls.constraints || [],
        }),
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
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          ⚡ Optimization
        </Typography>
        <Typography variant="caption">
          Status & monitoring
        </Typography>
      </Box>

      {/* Status */}
      <Box sx={{ p: 2 }}>
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
                value={maxIterations}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setMaxIterations(Math.max(1, parseInt(e.target.value) || 0))}
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

        {bestScore !== null && (
          <Box
            sx={{
              p: 2,
              bgcolor: 'success.light',
              borderRadius: 1,
              mb: 2,
            }}
          >
            <Typography variant="caption" color="success.dark">
              Best Score
            </Typography>
            <Typography variant="h4" color="success.dark" fontWeight="bold">
              {bestScore.toFixed(4)}
            </Typography>
          </Box>
        )}

        {/* Best Solution Display */}
        {results.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                🏆 Best Solution
              </Typography>
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={() => onResultsUpdate?.(results)}
                sx={{ fontSize: '0.75rem', py: 0.5 }}
              >
                Apply to Controls
              </Button>
            </Box>
            <Box
              sx={{
                p: 1.5,
                bgcolor: 'grey.100',
                borderRadius: 1,
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              {Object.entries(results[0].variables).map(([key, value]) => (
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
                  <Typography variant="body2" fontWeight="medium">
                    {key}:
                  </Typography>
                  <Typography variant="body2" color="primary">
                    {typeof value === 'number' ? value.toFixed(2) : value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Divider />
      </Box>

      {/* Controls */}
      <Box sx={{ p: 2 }}>
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

      {/* Logs */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          📋 Logs
        </Typography>
        <Box
          sx={{
            fontFamily: 'monospace',
            fontSize: 12,
            bgcolor: 'grey.100',
            p: 1,
            borderRadius: 1,
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {logs.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              No logs yet. Start optimization to see progress.
            </Typography>
          ) : (
            logs.slice(-20).map((log, idx) => (
              <Box key={idx} sx={{ mb: 0.5 }}>
                {log}
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Paper>
  );
}
