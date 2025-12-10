import { Paper, Typography } from '@mui/material';

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ payload: any }>;
}

export function CustomTooltip({ active, payload }: CustomTooltipProps) {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <Paper sx={{ p: 1.5, border: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 'bold' }}>
                    Solution #{data.rank}
                </Typography>
                <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                    <strong>Score:</strong> {data.score.toFixed(4)}
                </Typography>
                {data.objectives && Object.entries(data.objectives).map(([key, value]) => (
                    <Typography key={key} variant="caption" display="block" sx={{ mb: 0.5 }}>
                        <strong>{key}:</strong> {typeof value === 'number' ? value.toFixed(4) : String(value)}
                    </Typography>
                ))}
                {data.variables && Object.entries(data.variables).slice(0, 5).map(([key, value]) => (
                    <Typography key={key} variant="caption" display="block" sx={{ mb: 0.5 }}>
                        <strong>{key}:</strong> {typeof value === 'number' ? value.toFixed(2) : String(value)}
                    </Typography>
                ))}
            </Paper>
        );
    }
    return null;
}

