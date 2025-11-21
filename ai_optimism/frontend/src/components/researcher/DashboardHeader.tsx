/**
 * Dashboard header with title and actions
 */

import { Box, Typography, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import { BackendStatusIndicator } from '../BackendStatusIndicator';

interface DashboardHeaderProps {
  onRefresh: () => void;
  onLogout?: () => void;
}

export function DashboardHeader({ onRefresh, onLogout }: DashboardHeaderProps) {
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
        <BackendStatusIndicator />
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
        >
          Refresh
        </Button>
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
