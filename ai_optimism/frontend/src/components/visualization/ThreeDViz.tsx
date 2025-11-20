import { Box, Typography } from '@mui/material';
import ViewInArIcon from '@mui/icons-material/ViewInAr';

interface ThreeDVizProps {
    data?: unknown;
}

export function ThreeDViz({ data }: ThreeDVizProps) {
    return (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <ViewInArIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
                3D Visualization
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Interactive 3D design space
            </Typography>
        </Box>
    );
}
