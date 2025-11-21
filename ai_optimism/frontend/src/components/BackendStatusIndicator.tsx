'use client';

import { Chip, Tooltip } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  HourglassEmpty as HourglassEmptyIcon,
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useBackend } from '../contexts/BackendContext';

interface BackendStatusIndicatorProps {
  className?: string;
  onClick?: () => void;
}

export function BackendStatusIndicator({ className, onClick }: BackendStatusIndicatorProps) {
  const [isBackendAvailable, setIsBackendAvailable] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const { backendApi } = useBackend();

  useEffect(() => {
    let isMounted = true;

    const checkBackendHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

        const response = await fetch(backendApi.evaluate, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expressions: ['1+1'], // Simple health check
            variables: {},
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (isMounted) {
          setIsBackendAvailable(response.ok);
          setIsChecking(false);
        }
      } catch (error) {
        if (isMounted) {
          setIsBackendAvailable(false);
          setIsChecking(false);
        }
      }
    };

    // Initial check
    checkBackendHealth();

    // Periodic health check every 10 seconds
    const intervalId = setInterval(checkBackendHealth, 10000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const getStatusIcon = () => {
    if (isChecking) {
      return <HourglassEmptyIcon fontSize="small" />;
    }
    return isBackendAvailable ? <CheckCircleIcon fontSize="small" /> : <WarningIcon fontSize="small" />;
  };

  const getStatusLabel = () => {
    if (isChecking) {
      return 'Backend: Checking...';
    }
    return isBackendAvailable ? 'Backend: Connected' : 'Backend: Offline';
  };

  const getTooltipText = () => {
    if (isChecking) {
      return 'Checking backend server status...';
    }
    return isBackendAvailable
      ? 'Backend server is available for complex constraint evaluation'
      : 'Backend server unavailable. Using limited client-side evaluation.';
  };

  const getBackgroundColor = () => {
    if (isChecking) {
      return 'rgba(158, 158, 158, 0.7)';
    }
    return isBackendAvailable ? 'rgba(76, 175, 80, 0.9)' : 'rgba(255, 152, 0, 0.9)';
  };

  return (
    <Tooltip title={onClick ? `${getTooltipText()} (Click to configure)` : getTooltipText()} arrow>
      <Chip
        label={getStatusLabel()}
        icon={getStatusIcon()}
        size="small"
        className={className}
        onClick={onClick}
        sx={{
          fontSize: '0.75rem', // Slightly smaller to fit better when stacked
          height: '24px',      // Explicit height for better stacking
          fontWeight: 500,
          color: '#ffffff',
          cursor: onClick ? 'pointer' : 'default',
          '& .MuiChip-label': {
            px: 1.5,
          },
          '& .MuiChip-icon': {
            color: '#ffffff',
            fontSize: '1rem',
          },
          backgroundColor: getBackgroundColor(),
          '&:hover': {
            backgroundColor: onClick ? 'rgba(255, 255, 255, 0.1)' : getBackgroundColor(),
          },
        }}
      />
    </Tooltip>
  );
}
