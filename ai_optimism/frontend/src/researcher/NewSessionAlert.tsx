/**
 * New session notification banner
 */

import { Alert } from '@mui/material';

interface NewSessionAlertProps {
  show: boolean;
}

export function NewSessionAlert({ show }: NewSessionAlertProps) {
  if (!show) return null;

  return (
    <Alert 
      severity="success" 
      sx={{ mb: 3, bgcolor: 'success.light', color: 'success.contrastText' }}
    >
      🎉 New session detected! A user has started chatting.
    </Alert>
  );
}
