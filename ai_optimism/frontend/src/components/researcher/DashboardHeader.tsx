/**
 * Dashboard header with title and actions
 */

import { Box, Typography, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface DashboardHeaderProps {
  onRefresh: () => void;
}

export function DashboardHeader({ onRefresh }: DashboardHeaderProps) {
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
      <Button
        variant="outlined"
        startIcon={<RefreshIcon />}
        onClick={onRefresh}
      >
        Refresh
      </Button>
    </Box>
  );
}
