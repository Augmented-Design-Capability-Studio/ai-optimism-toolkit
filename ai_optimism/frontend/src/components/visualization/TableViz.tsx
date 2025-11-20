import { Box, Typography } from '@mui/material';
import GridOnIcon from '@mui/icons-material/GridOn';

export function TableViz() {
    return (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <GridOnIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
                Table View
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Tabular data display
            </Typography>
        </Box>
    );
}
