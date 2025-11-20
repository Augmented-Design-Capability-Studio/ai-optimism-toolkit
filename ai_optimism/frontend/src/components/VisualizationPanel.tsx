import { Box, Paper, Typography, ButtonGroup, Button } from '@mui/material';
import { useState } from 'react';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import GridOnIcon from '@mui/icons-material/GridOn';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import HubIcon from '@mui/icons-material/Hub';

import { HeuristicNetwork } from './visualization/HeuristicNetwork';
import { ChartViz } from './visualization/ChartViz';
import { TableViz } from './visualization/TableViz';
import { ThreeDViz } from './visualization/ThreeDViz';

type VizType = 'chart' | 'table' | '3d' | 'weights';

interface VisualizationPanelProps {
    data?: unknown;
}

export function VisualizationPanel({ data }: VisualizationPanelProps) {
    const [vizType, setVizType] = useState<VizType>('weights'); // Default to 'weights'

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
                    overflow: 'hidden'
                }}
            >
                {vizType === 'chart' && <ChartViz data={data} />}
                {vizType === 'table' && <TableViz />}
                {vizType === '3d' && <ThreeDViz />}
                {vizType === 'weights' && <HeuristicNetwork data={data} />}
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
