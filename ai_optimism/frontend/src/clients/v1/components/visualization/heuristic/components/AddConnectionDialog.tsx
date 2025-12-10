import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, Stack, Typography, Slider } from '@mui/material';
import { formatLabel } from '../utils/labelFormatting';
import type { HeuristicMapData } from '../types';

interface AddConnectionDialogProps {
    open: boolean;
    data: HeuristicMapData | null;
    newConnection: { obj: string; mod: string; weight: number };
    onClose: () => void;
    onConnectionChange: (connection: { obj: string; mod: string; weight: number }) => void;
    onAdd: () => void;
}

export function AddConnectionDialog({
    open,
    data,
    newConnection,
    onClose,
    onConnectionChange,
    onAdd,
}: AddConnectionDialogProps) {
    if (!data) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Add New Connection</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Objective / Violation</InputLabel>
                        <Select
                            value={newConnection.obj}
                            label="Objective / Violation"
                            onChange={(e) => onConnectionChange({ ...newConnection, obj: e.target.value })}
                        >
                            {data.objectives.map((obj) => (
                                <MenuItem key={obj} value={obj}>
                                    {formatLabel(obj, 'objective')}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth size="small">
                        <InputLabel>Modifier Action</InputLabel>
                        <Select
                            value={newConnection.mod}
                            label="Modifier Action"
                            onChange={(e) => onConnectionChange({ ...newConnection, mod: e.target.value })}
                        >
                            {data.modifiers.map((mod) => (
                                <MenuItem key={mod} value={mod}>
                                    {formatLabel(mod, 'modifier')}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Box>
                        <Typography variant="caption" color="text.secondary">Influence Weight</Typography>
                        <Stack spacing={2} direction="row" alignItems="center">
                            <Typography variant="caption">-1.0</Typography>
                            <Slider
                                size="small"
                                value={newConnection.weight}
                                min={-1.0}
                                max={1.0}
                                step={0.1}
                                onChange={(_, val) => onConnectionChange({ ...newConnection, weight: val as number })}
                                valueLabelDisplay="auto"
                                marks={[
                                    { value: -1, label: '' },
                                    { value: 0, label: '0' },
                                    { value: 1, label: '' },
                                ]}
                            />
                            <Typography variant="caption">+1.0</Typography>
                        </Stack>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={onAdd}
                    variant="contained"
                    disabled={!newConnection.obj || !newConnection.mod}
                >
                    Add
                </Button>
            </DialogActions>
        </Dialog>
    );
}

