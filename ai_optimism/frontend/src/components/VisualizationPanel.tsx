'use client';

import { Box, Paper, Typography, ButtonGroup, Button } from '@mui/material';
import { useState } from 'react';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import GridOnIcon from '@mui/icons-material/GridOn';
import ViewInArIcon from '@mui/icons-material/ViewInAr';

type VizType = 'chart' | 'table' | '3d';

interface VisualizationPanelProps {
  data?: unknown;
}

export function VisualizationPanel({ data }: VisualizationPanelProps) {
  const [vizType, setVizType] = useState<VizType>('chart');

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
          bgcolor: 'info.main',
          color: 'info.contrastText',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight="bold">
            📊 Visualization
          </Typography>
          <Typography variant="caption">
            Interactive design space
          </Typography>
        </Box>
        <ButtonGroup size="small" variant="outlined" sx={{ bgcolor: 'white' }}>
          <Button
            onClick={() => setVizType('chart')}
            variant={vizType === 'chart' ? 'contained' : 'outlined'}
          >
            <ShowChartIcon fontSize="small" />
          </Button>
          <Button
            onClick={() => setVizType('table')}
            variant={vizType === 'table' ? 'contained' : 'outlined'}
          >
            <GridOnIcon fontSize="small" />
          </Button>
          <Button
            onClick={() => setVizType('3d')}
            variant={vizType === '3d' ? 'contained' : 'outlined'}
          >
            <ViewInArIcon fontSize="small" />
          </Button>
        </ButtonGroup>
      </Box>

      {/* Visualization Area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          bgcolor: 'grey.50',
        }}
      >
        {vizType === 'chart' && (
          <Box textAlign="center">
            <ShowChartIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Chart Visualization
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Will display optimization design space
            </Typography>
            {data !== undefined && data !== null && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Data loaded
              </Typography>
            )}
          </Box>
        )}

        {vizType === 'table' && (
          <Box textAlign="center">
            <GridOnIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Table View
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tabular data display
            </Typography>
          </Box>
        )}

        {vizType === '3d' && (
          <Box textAlign="center">
            <ViewInArIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              3D Visualization
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Interactive 3D design space
            </Typography>
          </Box>
        )}
      </Box>

      {/* Info Footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
        <Typography variant="caption" color="text.secondary">
          💡 Tip: Click and drag to manipulate design points directly
        </Typography>
      </Box>
    </Paper>
  );
}
