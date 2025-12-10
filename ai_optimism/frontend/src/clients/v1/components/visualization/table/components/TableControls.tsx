import { Stack, TextField, InputAdornment, Chip, IconButton, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';

interface TableControlsProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onExport: () => void;
    resultCount: number;
}

export function TableControls({ searchQuery, onSearchChange, onExport, resultCount }: TableControlsProps) {
    return (
        <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
            <TextField
                size="small"
                placeholder="Search solutions..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                }}
                sx={{ flex: 1, maxWidth: 400 }}
            />
            <Tooltip title="Export to CSV">
                <IconButton onClick={onExport} size="small">
                    <DownloadIcon />
                </IconButton>
            </Tooltip>
            <Chip 
                label={`${resultCount} solution${resultCount !== 1 ? 's' : ''}`} 
                size="small" 
                color="primary" 
                variant="outlined"
            />
        </Stack>
    );
}

