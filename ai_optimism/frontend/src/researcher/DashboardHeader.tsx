/**
 * Dashboard header with title and actions
 */

import { Box, Typography, Button } from '@mui/material';
import { memo } from 'react';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ScienceIcon from '@mui/icons-material/Science';
import { BackendStatusIndicator } from '../core/components/status/BackendStatusIndicator';

interface DashboardHeaderProps {
  onRefresh: () => void;
  onLogout?: () => void;
  onClearAll?: () => void;
  onDeleteByIP?: () => void;
  onBackendSettings?: () => void;
}

export const DashboardHeader = memo(function DashboardHeader({ onRefresh, onLogout, onClearAll, onDeleteByIP, onBackendSettings }: DashboardHeaderProps) {
  return (
    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ScienceIcon sx={{ color: 'primary.main' }} />
        <Typography variant="h5" fontWeight="bold">
          Researcher Dashboard
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <BackendStatusIndicator onClick={onBackendSettings} />
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
        >
          Refresh
        </Button>
        {onDeleteByIP && (
          <Button
            variant="outlined"
            color="info"
            onClick={onDeleteByIP}
            sx={{ textTransform: 'none' }}
          >
            Delete by IP
          </Button>
        )}
        {onClearAll && (
          <Button
            variant="outlined"
            color="warning"
            startIcon={<DeleteSweepIcon />}
            onClick={onClearAll}
          >
            Clear All
          </Button>
        )}
        {onLogout && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={onLogout}
          >
            Logout
          </Button>
        )}
      </Box>
    </Box>
  );
});
