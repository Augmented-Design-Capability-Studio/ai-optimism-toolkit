'use client';

import { Alert, Collapse } from '@mui/material';
import { useEffect, useState } from 'react';
import { BACKEND_API } from '../config/backend';

interface BackendStatusIndicatorProps {
  className?: string;
}

export function BackendStatusIndicator({ className }: BackendStatusIndicatorProps) {
  const [isBackendAvailable, setIsBackendAvailable] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const checkBackendHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

        const response = await fetch(BACKEND_API.evaluate, {
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

  // Don't show anything while initially checking or if backend is available
  if (isChecking || isBackendAvailable) {
    return null;
  }

  return (
    <Collapse in={!isBackendAvailable}>
      <Alert 
        severity="warning" 
        className={className}
        sx={{ m: 0 }}
      >
        Backend server unavailable. Complex constraints will use limited client-side evaluation.
      </Alert>
    </Collapse>
  );
}
