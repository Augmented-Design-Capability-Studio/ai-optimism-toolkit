import { Box, Paper, Typography, ButtonGroup, Button } from '@mui/material';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import GridOnIcon from '@mui/icons-material/GridOn';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import HubIcon from '@mui/icons-material/Hub';
import LightbulbIcon from '@mui/icons-material/Lightbulb';

import { HeuristicNetwork } from './visualization/heuristic/HeuristicNetwork';
import { ThreeDViz } from './visualization/threed/ThreeDViz';

// Dynamic imports with SSR disabled for Recharts components
const ChartViz = dynamic(() => import('./visualization/chart/ChartViz'), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4 }}>
      <Typography variant="body2" color="text.secondary">Loading chart...</Typography>
    </Box>
  )
});

const TableViz = dynamic(() => import('./visualization/table/TableViz'), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4 }}>
      <Typography variant="body2" color="text.secondary">Loading table...</Typography>
    </Box>
  )
});

type VizType = 'chart' | 'table' | '3d' | 'weights';

interface VisualizationPanelProps {
    data?: unknown;
    onWeightsChange?: (weights: Record<string, Record<string, number>>) => void;
}

export function VisualizationPanel({ data, onWeightsChange }: VisualizationPanelProps) {
    const [vizType, setVizType] = useState<VizType>('weights'); // Default to 'weights'

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
                    borderTopColor: 'warning.main',
                    bgcolor: 'white',
                    color: 'text.primary',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ShowChartIcon sx={{ color: 'warning.main' }} />
                        Visualization
                    </Typography>
                    <Typography variant="caption">
                        Interactive design space
                    </Typography>
                </Box>
                <ButtonGroup size="small" variant="outlined" sx={{ bgcolor: 'white' }}>
                    <Button
                        onClick={() => setVizType('weights')}
                        variant={vizType === 'weights' ? 'contained' : 'outlined'}
                        title="Heuristic Weights"
                    >
                        <HubIcon fontSize="small" />
                    </Button>
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
                    flexDirection: 'column',
                    p: 0,
                    bgcolor: 'grey.50',
                }}
            >
                {/* Content */}
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    {vizType === 'chart' && <ChartViz data={data as any} />}
                    {vizType === 'table' && <TableViz data={data as any} />}
                    {vizType === '3d' && <ThreeDViz data={data} />}
                    {vizType === 'weights' && (
                        (data && (data as any)?.heuristic_map) ? (
                            <HeuristicNetwork data={data} onWeightsChange={onWeightsChange} />
                        ) : (
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: 'text.secondary',
                                p: 4,
                                textAlign: 'center'
                            }}>
                                <Typography variant="body2">
                                    Run optimization to view heuristic network
                                </Typography>
                            </Box>
                        )
                    )}
                </Box>
            </Box>

            {/* Info Footer */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LightbulbIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                    Tip: Click and drag to manipulate design points directly
                </Typography>
            </Box>
        </Paper>
    );
}
