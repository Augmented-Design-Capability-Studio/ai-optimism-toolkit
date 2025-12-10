import { Box, Typography, Popover, Slider, Stack, Button, ButtonGroup } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { formatLabel } from '../utils/labelFormatting';
import type { Edge } from '../types';

interface WeightEditPopoverProps {
    open: boolean;
    anchorEl: SVGElement | null;
    selectedEdge: Edge | null;
    onClose: () => void;
    onWeightChange: (event: Event, newValue: number | number[]) => void;
    onSave: () => void;
    onQuickWeight: (val: number) => void;
}

export function WeightEditPopover({
    open,
    anchorEl,
    selectedEdge,
    onClose,
    onWeightChange,
    onSave,
    onQuickWeight,
}: WeightEditPopoverProps) {
    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{
                vertical: 'center',
                horizontal: 'center',
            }}
            transformOrigin={{
                vertical: 'center',
                horizontal: 'center',
            }}
        >
            <Box sx={{ p: 2, width: 280 }}>
                <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                    Edit Influence Weight
                </Typography>
                {selectedEdge && (
                    <>
                        <Box sx={{ mb: 2, bgcolor: 'grey.50', p: 1, borderRadius: 1 }}>
                            <Typography variant="caption" display="block" color="text.secondary">
                                Objective: <strong>{formatLabel(selectedEdge.obj, 'objective')}</strong>
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                                Action: <strong>{formatLabel(selectedEdge.mod, 'modifier')}</strong>
                            </Typography>
                        </Box>

                        <Typography variant="caption" color="text.secondary" gutterBottom>
                            Quick Actions
                        </Typography>
                        <ButtonGroup size="small" fullWidth sx={{ mb: 2 }}>
                            <Button onClick={() => onQuickWeight(-1.0)} color="error">Suppress (-1)</Button>
                            <Button onClick={() => onQuickWeight(0)} color="inherit">Neutral (0)</Button>
                            <Button onClick={() => onQuickWeight(1.0)} color="success">Promote (+1)</Button>
                        </ButtonGroup>

                        <Typography variant="caption" color="text.secondary">
                            Fine Tune
                        </Typography>
                        <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
                            <Typography variant="caption">-1.0</Typography>
                            <Slider
                                size="small"
                                value={selectedEdge.weight}
                                min={-1.0}
                                max={1.0}
                                step={0.1}
                                onChange={onWeightChange}
                                valueLabelDisplay="auto"
                                track={false}
                                marks={[
                                    { value: -1, label: '' },
                                    { value: 0, label: '0' },
                                    { value: 1, label: '' },
                                ]}
                                sx={{
                                    color: selectedEdge.weight > 0 ? 'success.main' : (selectedEdge.weight < 0 ? 'error.main' : 'grey.500')
                                }}
                            />
                            <Typography variant="caption">+1.0</Typography>
                        </Stack>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                            <Typography variant="body2" fontWeight="bold" sx={{
                                color: selectedEdge.weight > 0 ? 'success.main' : (selectedEdge.weight < 0 ? 'error.main' : 'text.primary')
                            }}>
                                Current: {selectedEdge.weight.toFixed(1)}
                            </Typography>
                            <Button
                                variant="contained"
                                size="small"
                                onClick={onSave}
                                startIcon={<CheckIcon />}
                            >
                                Save
                            </Button>
                        </Box>
                    </>
                )}
            </Box>
        </Popover>
    );
}

