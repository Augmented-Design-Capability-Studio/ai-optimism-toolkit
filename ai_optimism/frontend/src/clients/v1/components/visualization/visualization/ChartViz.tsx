import { Box, Typography } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';

interface ChartVizProps {
    data?: unknown;
}

export function ChartViz({ data }: ChartVizProps) {
    return (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
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
    );
}
