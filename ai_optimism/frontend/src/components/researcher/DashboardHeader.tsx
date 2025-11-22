/**
 * Dashboard header with title and actions
 */

import { Box, Typography, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { BackendStatusIndicator } from '../BackendStatusIndicator';

interface DashboardHeaderProps {
  onRefresh: () => void;
  onLogout?: () => void;
  onClearAll?: () => void;
  onBackendSettings?: () => void;
}

export function DashboardHeader({ onRefresh, onLogout, onClearAll, onBackendSettings }: DashboardHeaderProps) {
  return (
    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          🧙 Researcher Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monitor sessions, provide guidance, and formalize optimization problems
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
}
