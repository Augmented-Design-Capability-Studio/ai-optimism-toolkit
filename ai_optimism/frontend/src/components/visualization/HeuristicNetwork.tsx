import { Box, Typography, Popover, Slider, Stack, Button, ButtonGroup, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useState, useEffect } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import AddIcon from '@mui/icons-material/Add';

interface HeuristicNetworkProps {
    data: any;
}

// Helper to make names user-friendly
const formatLabel = (label: string, type: 'objective' | 'modifier'): string => {
    if (!label) return '';

    // Handle Modifiers
    if (type === 'modifier') {
        if (label.startsWith('inc_')) return `Increase ${label.substring(4)}`;
        if (label.startsWith('dec_')) return `Decrease ${label.substring(4)}`;
        if (label.startsWith('rand_')) return `Randomize ${label.substring(5)}`;
        return label;
    }

    // Handle Objectives/Violations
    if (type === 'objective') {
        if (label.startsWith('Violation(')) {
            // Extract content inside Violation(...)
            const content = label.substring(10, label.length - 1);
            return `Avoid Violation: ${content}`;
        }
        return label;
    }

    return label;
};

export function HeuristicNetwork({ data }: HeuristicNetworkProps) {
    const [anchorEl, setAnchorEl] = useState<SVGElement | null>(null);
    const [selectedEdge, setSelectedEdge] = useState<{ obj: string, mod: string, weight: number } | null>(null);

    // Local state for graph data to support editing
    const [localData, setLocalData] = useState<any>(null);

    // State for adding new connection
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newConnection, setNewConnection] = useState<{ obj: string, mod: string, weight: number }>({ obj: '', mod: '', weight: 0.5 });

    // Initialize local data from props
    useEffect(() => {
        if (data?.heuristic_map) {
            setLocalData(JSON.parse(JSON.stringify(data.heuristic_map)));
        } else if (!localData) {
            // Default dummy data if nothing provided
            setLocalData({
                objectives: ['Violation(A+R)', 'Violation(R>=10k)', 'Max Profit'],
                modifiers: ['inc_A', 'dec_A', 'inc_R', 'dec_R'],
                weights: {
                    'Violation(A+R)': { 'dec_A': 1.0, 'dec_R': 1.0, 'inc_A': -0.5, 'inc_R': -0.5 },
                    'Violation(R>=10k)': { 'inc_R': 1.0, 'dec_R': -1.0 },
                    'Max Profit': { 'inc_A': 0.8, 'inc_R': 0.2 }
                }
            });
        }
    }, [data]);

    const handleEdgeClick = (event: React.MouseEvent<SVGElement>, obj: string, mod: string, weight: number) => {
        setAnchorEl(event.currentTarget);
        setSelectedEdge({ obj, mod, weight });
    };

    const handleClose = () => {
        setAnchorEl(null);
        setSelectedEdge(null);
    };

    const handleWeightChange = (_: Event, newValue: number | number[]) => {
        if (selectedEdge) {
            setSelectedEdge({ ...selectedEdge, weight: newValue as number });
        }
    };

    const handleSave = () => {
        if (selectedEdge && localData) {
            // Update local data structure
            const newData = { ...localData };
            if (!newData.weights[selectedEdge.obj]) {
                newData.weights[selectedEdge.obj] = {};
            }
            newData.weights[selectedEdge.obj][selectedEdge.mod] = selectedEdge.weight;
            setLocalData(newData);

            // Here you would also dispatch to backend
            console.log('Saved weight:', selectedEdge);
            handleClose();
        }
    };

    const handleAddConnection = () => {
        if (newConnection.obj && newConnection.mod && localData) {
            const newData = { ...localData };
            if (!newData.weights[newConnection.obj]) {
                newData.weights[newConnection.obj] = {};
            }
            newData.weights[newConnection.obj][newConnection.mod] = newConnection.weight;
            setLocalData(newData);
            setAddDialogOpen(false);
            // Reset form but keep weight
            setNewConnection(prev => ({ ...prev, obj: '', mod: '' }));
        }
    };

    const setQuickWeight = (val: number) => {
        if (selectedEdge) {
            setSelectedEdge({ ...selectedEdge, weight: val });
        }
    };

    const open = Boolean(anchorEl);

    if (!localData) return <Box sx={{ p: 2 }}>Loading visualization...</Box>;

    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2, overflow: 'hidden', position: 'relative' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                    Interactive Heuristic Network
                </Typography>
                <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setAddDialogOpen(true)}
                    variant="outlined"
                >
                    Add Connection
                </Button>
            </Box>

            <Box sx={{ flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'white', position: 'relative', overflow: 'auto' }}>
                {/* SVG Graph */}
                <svg width="100%" height="100%" style={{ minHeight: 400, minWidth: 600 }} viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <marker id="arrowhead-pos" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#2e7d32" />
                        </marker>
                        <marker id="arrowhead-neg" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#d32f2f" />
                        </marker>
                    </defs>

                    {/* Edges */}
                    {/* @ts-ignore */}
                    {localData.objectives.map((obj, objIdx) => {
                        // @ts-ignore
                        return localData.modifiers.map((mod, modIdx) => {
                            // Get weight from localData, unless currently editing this specific edge
                            let weight = localData.weights[obj]?.[mod] || 0;

                            // If this edge is being edited, show the live value from the slider
                            if (selectedEdge && selectedEdge.obj === obj && selectedEdge.mod === mod) {
                                weight = selectedEdge.weight;
                            }

                            if (weight === 0 && (!selectedEdge || selectedEdge.obj !== obj || selectedEdge.mod !== mod)) return null;

                            // Calculate positions
                            const objY = 50 + (objIdx * (300 / Math.max(1, localData.objectives.length - 1)));
                            const modY = 50 + (modIdx * (300 / Math.max(1, localData.modifiers.length - 1)));

                            const startX = 100 + 65; // Node width/2
                            const startY = objY;
                            const endX = 500 - 60;
                            const endY = modY;

                            const color = weight > 0 ? '#2e7d32' : '#d32f2f';
                            const opacity = Math.min(1, Math.abs(weight) + 0.2);
                            const strokeWidth = 1 + Math.abs(weight) * 3;

                            return (
                                <g key={`${obj}-${mod}`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => handleEdgeClick(e, obj, mod, weight)}
                                >
                                    <path
                                        d={`M ${startX} ${startY} C ${startX + 100} ${startY}, ${endX - 100} ${endY}, ${endX} ${endY}`}
                                        stroke={color}
                                        strokeWidth={strokeWidth}
                                        fill="none"
                                        opacity={opacity}
                                        markerEnd={`url(#arrowhead-${weight > 0 ? 'pos' : 'neg'})`}
                                    />
                                    {/* Invisible wider path for easier clicking */}
                                    <path
                                        d={`M ${startX} ${startY} C ${startX + 100} ${startY}, ${endX - 100} ${endY}, ${endX} ${endY}`}
                                        stroke="transparent"
                                        strokeWidth={15}
                                        fill="none"
                                    />
                                </g>
                            );
                        });
                    })}

                    {/* Objective Nodes (Left) */}
                    {/* @ts-ignore */}
                    {localData.objectives.map((obj, idx) => {
                        const y = 50 + (idx * (300 / Math.max(1, localData.objectives.length - 1)));
                        const label = formatLabel(obj, 'objective');
                        return (
                            <g key={obj} transform={`translate(100, ${y})`}>
                                <rect x="-80" y="-20" width="160" height="40" rx="5" fill="#e3f2fd" stroke="#1976d2" strokeWidth="1" />
                                <text x="0" y="5" textAnchor="middle" fontSize="11" fill="#0d47a1" fontWeight="bold">
                                    {label.length > 22 ? label.substring(0, 20) + '..' : label}
                                </text>
                                <title>{label}</title>
                            </g>
                        );
                    })}

                    {/* Modifier Nodes (Right) */}
                    {/* @ts-ignore */}
                    {localData.modifiers.map((mod, idx) => {
                        const y = 50 + (idx * (300 / Math.max(1, localData.modifiers.length - 1)));
                        const label = formatLabel(mod, 'modifier');
                        return (
                            <g key={mod} transform={`translate(500, ${y})`}>
                                <rect x="-70" y="-20" width="140" height="40" rx="5" fill="#f3e5f5" stroke="#7b1fa2" strokeWidth="1" />
                                <text x="0" y="5" textAnchor="middle" fontSize="11" fill="#4a148c" fontWeight="bold">
                                    {label}
                                </text>
                                <title>{label}</title>
                            </g>
                        );
                    })}
                </svg>
            </Box>
            <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary', display: 'block' }}>
                Green = Positive Impact, Red = Negative Impact. Click a line to edit weight.
            </Typography>

            {/* Weight Edit Popover */}
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
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
                                <Button onClick={() => setQuickWeight(-1.0)} color="error">Suppress (-1)</Button>
                                <Button onClick={() => setQuickWeight(0)} color="inherit">Neutral (0)</Button>
                                <Button onClick={() => setQuickWeight(1.0)} color="success">Promote (+1)</Button>
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
                                    onChange={handleWeightChange}
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
                                    onClick={handleSave}
                                    startIcon={<CheckIcon />}
                                >
                                    Save
                                </Button>
                            </Box>
                        </>
                    )}
                </Box>
            </Popover>

            {/* Add Connection Dialog */}
            <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Add New Connection</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Objective / Violation</InputLabel>
                            <Select
                                value={newConnection.obj}
                                label="Objective / Violation"
                                onChange={(e) => setNewConnection({ ...newConnection, obj: e.target.value })}
                            >
                                {/* @ts-ignore */}
                                {localData.objectives.map((obj) => (
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
                                onChange={(e) => setNewConnection({ ...newConnection, mod: e.target.value })}
                            >
                                {/* @ts-ignore */}
                                {localData.modifiers.map((mod) => (
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
                                    onChange={(_, val) => setNewConnection({ ...newConnection, weight: val as number })}
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
                    <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleAddConnection}
                        variant="contained"
                        disabled={!newConnection.obj || !newConnection.mod}
                    >
                        Add
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
