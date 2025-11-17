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
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useState } from 'react';

type OptimizationStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

interface OptimizationPanelProps {
  onStart?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onReset?: () => void;
}

export function OptimizationPanel({ onStart, onPause, onStop, onReset }: OptimizationPanelProps) {
  const [status, setStatus] = useState<OptimizationStatus>('idle');
  const [iteration, setIteration] = useState(0);
  const [maxIterations] = useState(1000);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const handleStart = () => {
    setStatus('running');
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Optimization started`]);
    // Simulate progress
    let iter = 0;
    const interval = setInterval(() => {
      iter += 10;
      setIteration(iter);
      setBestScore(Math.random() * 100);
      setLogs((prev) => [...prev, `Iteration ${iter}: Score = ${(Math.random() * 100).toFixed(2)}`]);
      if (iter >= maxIterations) {
        clearInterval(interval);
        setStatus('completed');
        setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Optimization completed`]);
      }
    }, 100);
    onStart?.();
  };

  const handlePause = () => {
    setStatus('paused');
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Optimization paused`]);
    onPause?.();
  };

  const handleStop = () => {
    setStatus('idle');
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Optimization stopped`]);
    onStop?.();
  };

  const handleReset = () => {
    setStatus('idle');
    setIteration(0);
    setBestScore(null);
    setLogs([]);
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
      elevation={2}
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
          bgcolor: 'success.main',
          color: 'success.contrastText',
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              Iteration: {iteration} / {maxIterations}
            </Typography>
            <Typography variant="body2">
              {((iteration / maxIterations) * 100).toFixed(0)}%
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
