import { Box, IconButton, Typography, Button } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

interface ZoomControlsProps {
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
    return (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5 }}>
            <IconButton size="small" onClick={onZoomOut} disabled={zoom <= 0.5}>
                <ZoomOutIcon fontSize="small" />
            </IconButton>
            <Typography variant="caption" sx={{ minWidth: 45, textAlign: 'center' }}>
                {Math.round(zoom * 100)}%
            </Typography>
            <IconButton size="small" onClick={onZoomIn} disabled={zoom >= 3.0}>
                <ZoomInIcon fontSize="small" />
            </IconButton>
            <Button size="small" onClick={onReset} sx={{ ml: 0.5, minWidth: 'auto', px: 1 }}>
                Reset
            </Button>
        </Box>
    );
}

