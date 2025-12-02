import { Box, Typography, Popover, Slider, Stack, Button, ButtonGroup, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, IconButton } from '@mui/material';
import { useState, useEffect, useRef } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import AddIcon from '@mui/icons-material/Add';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

interface HeuristicNetworkProps {
    data: any;
}

// Helper to parse modifier into action and variable name
const parseModifier = (label: string): { action: string; variable: string } => {
    if (!label) return { action: '', variable: '' };
    
    if (label.startsWith('inc_')) {
        return { action: 'Increase', variable: label.substring(4) };
    }
    if (label.startsWith('dec_')) {
        return { action: 'Decrease', variable: label.substring(4) };
    }
    if (label.startsWith('rand_')) {
        return { action: 'Randomize', variable: label.substring(5) };
    }
    return { action: '', variable: label };
};

// Helper to make names user-friendly
const formatLabel = (label: string, type: 'objective' | 'modifier'): string => {
    if (!label) return '';

    // Handle Modifiers
    if (type === 'modifier') {
        const { action, variable } = parseModifier(label);
        return action ? `${action} ${variable}` : variable;
    }

    // Handle Objectives/Violations
    if (type === 'objective') {
        // New format: "Violation: description"
        if (label.startsWith('Violation: ')) {
            return label; // Already in readable format
        }
        // Old format: "Violation(expression)"
        if (label.startsWith('Violation(')) {
            // Extract content inside Violation(...)
            const content = label.substring(10, label.length - 1);
            return `Avoid: ${content}`;
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

    // Zoom and pan state
    const [zoom, setZoom] = useState(1.0);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const svgRef = useRef<SVGSVGElement>(null);

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

    // Zoom handlers
    const handleZoomIn = () => {
        setZoom(prev => Math.min(3.0, prev + 0.2));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(0.5, prev - 0.2));
    };

    const handleZoomReset = () => {
        setZoom(1.0);
        setPan({ x: 0, y: 0 });
    };

    // Pan handlers
    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
        if (e.button === 0) { // Left mouse button
            setIsPanning(true);
            setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (isPanning) {
            setPan({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    // Wheel handler for zoom and pan
    const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
            // Zoom with Ctrl/Cmd + scroll
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setZoom(prev => Math.max(0.5, Math.min(3.0, prev + delta)));
        } else {
            // Pan with regular scroll
            setPan(prev => ({
                x: prev.x - e.deltaX,
                y: prev.y - e.deltaY
            }));
        }
    };

    const open = Boolean(anchorEl);

    if (!localData) return <Box sx={{ p: 2 }}>Loading visualization...</Box>;

    // Calculate dynamic layout
    const numObjectives = localData.objectives?.length || 0;
    const numModifiers = localData.modifiers?.length || 0;
    const minSpacing = 60;
    const padding = 50;
    const nodeHeight = 55; // Increased to accommodate wrapped text
    const objBoxWidth = 200; // Increased from 160
    const modBoxWidth = 180; // Increased from 140
    
    // Calculate SVG dimensions first
    const baseHeight = Math.max(numObjectives, numModifiers) * minSpacing + 2 * padding;
    const svgHeight = Math.max(400, baseHeight);
    const svgWidth = 600;
    
    // Calculate spacing based on actual SVG height
    const objSpacing = numObjectives > 1 
        ? Math.max(minSpacing, (svgHeight - 2 * padding - nodeHeight) / (numObjectives - 1))
        : 0;
    const modSpacing = numModifiers > 1
        ? Math.max(minSpacing, (svgHeight - 2 * padding - nodeHeight) / (numModifiers - 1))
        : 0;
    
    // Node positions
    const getObjectiveY = (idx: number) => {
        if (numObjectives === 1) return svgHeight / 2;
        return padding + (idx * objSpacing);
    };
    
    const getModifierY = (idx: number) => {
        if (numModifiers === 1) return svgHeight / 2;
        return padding + (idx * modSpacing);
    };
    
    const leftX = 100;
    const rightX = svgWidth - 100;

    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2, overflow: 'hidden', position: 'relative' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                    Interactive Heuristic Network
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5 }}>
                        <IconButton size="small" onClick={handleZoomOut} disabled={zoom <= 0.5}>
                            <ZoomOutIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="caption" sx={{ minWidth: 45, textAlign: 'center' }}>
                            {Math.round(zoom * 100)}%
                        </Typography>
                        <IconButton size="small" onClick={handleZoomIn} disabled={zoom >= 3.0}>
                            <ZoomInIcon fontSize="small" />
                        </IconButton>
                        <Button size="small" onClick={handleZoomReset} sx={{ ml: 0.5, minWidth: 'auto', px: 1 }}>
                            Reset
                        </Button>
                    </Box>
                    <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => setAddDialogOpen(true)}
                        variant="outlined"
                    >
                        Add Connection
                    </Button>
                </Box>
            </Box>

            <Box sx={{ flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'white', position: 'relative', overflow: 'auto' }}>
                {/* SVG Graph */}
                <svg 
                    ref={svgRef}
                    width="100%" 
                    height="100%" 
                    style={{ minHeight: 400, minWidth: svgWidth, cursor: isPanning ? 'grabbing' : 'grab' }}
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    preserveAspectRatio="xMidYMid meet"
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
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

                            // Calculate positions using dynamic layout
                            const objY = getObjectiveY(objIdx);
                            const modY = getModifierY(modIdx);

                            const startX = leftX + objBoxWidth / 2;
                            const startY = objY;
                            const endX = rightX - modBoxWidth / 2;
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
                        const y = getObjectiveY(idx);
                        const label = formatLabel(obj, 'objective');
                        
                        // Determine if it's a violation or regular objective
                        let typeLabel = 'Objective';
                        let contentLabel = obj;
                        
                        if (obj.startsWith('Violation: ')) {
                            typeLabel = 'Violation';
                            contentLabel = obj.substring(11); // Remove "Violation: " prefix
                        } else if (obj.startsWith('Violation(')) {
                            typeLabel = 'Violation';
                            // Extract content inside Violation(...)
                            contentLabel = obj.substring(10, obj.length - 1);
                        } else {
                            // Regular objective - use the name as-is
                            contentLabel = obj;
                        }
                        
                        // Split content into multiple lines if too long (max ~22 chars per line)
                        const maxCharsPerLine = 22;
                        const words = contentLabel.split(/\s+/);
                        const lines: string[] = [];
                        let currentLine = '';
                        
                        for (const word of words) {
                            if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
                                currentLine = currentLine ? `${currentLine} ${word}` : word;
                            } else {
                                if (currentLine) lines.push(currentLine);
                                // If single word is longer than max, truncate it
                                if (word.length > maxCharsPerLine) {
                                    lines.push(word.substring(0, maxCharsPerLine - 3) + '..');
                                    currentLine = '';
                                } else {
                                    currentLine = word;
                                }
                            }
                        }
                        if (currentLine) lines.push(currentLine);
                        
                        // Limit to 2 lines max
                        const displayLines = lines.slice(0, 2);
                        if (lines.length > 2) {
                            displayLines[1] = displayLines[1].substring(0, Math.min(displayLines[1].length, maxCharsPerLine - 3)) + '..';
                        }
                        
                        return (
                            <g key={obj} transform={`translate(${leftX}, ${y})`}>
                                <rect x="-100" y="-25" width={objBoxWidth} height={nodeHeight} rx="5" fill="#e3f2fd" stroke="#1976d2" strokeWidth="1" />
                                <text x="0" y="-8" textAnchor="middle" fontSize="10" fill="#0d47a1" fontWeight="bold" dominantBaseline="middle">
                                    {typeLabel}
                                </text>
                                {displayLines.map((line, lineIdx) => (
                                    <text 
                                        key={lineIdx}
                                        x="0" 
                                        y={2 + (lineIdx * 10)} 
                                        textAnchor="middle" 
                                        fontSize="9" 
                                        fill="#0d47a1" 
                                        fontWeight="normal" 
                                        dominantBaseline="middle"
                                    >
                                        {line}
                                    </text>
                                ))}
                                <title>{label}</title>
                            </g>
                        );
                    })}

                    {/* Modifier Nodes (Right) */}
                    {/* @ts-ignore */}
                    {localData.modifiers.map((mod, idx) => {
                        const y = getModifierY(idx);
                        const { action, variable } = parseModifier(mod);
                        return (
                            <g key={mod} transform={`translate(${rightX}, ${y})`}>
                                <rect x={-modBoxWidth / 2} y={-nodeHeight / 2} width={modBoxWidth} height={nodeHeight} rx="5" fill="#f3e5f5" stroke="#7b1fa2" strokeWidth="1" />
                                {action ? (
                                    <>
                                        <text x="0" y="-5" textAnchor="middle" fontSize="10" fill="#4a148c" fontWeight="bold" dominantBaseline="middle">
                                            {action}
                                        </text>
                                        <text x="0" y="8" textAnchor="middle" fontSize="10" fill="#4a148c" fontWeight="normal" dominantBaseline="middle">
                                            {variable.length > 18 ? variable.substring(0, 16) + '..' : variable}
                                        </text>
                                    </>
                                ) : (
                                    <text x="0" y="0" textAnchor="middle" fontSize="10" fill="#4a148c" fontWeight="bold" dominantBaseline="middle">
                                        {variable.length > 20 ? variable.substring(0, 18) + '..' : variable}
                                    </text>
                                )}
                                <title>{formatLabel(mod, 'modifier')}</title>
                            </g>
                        );
                    })}
                    </g>
                </svg>
            </Box>
            <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary', display: 'block' }}>
                Green = Positive Impact, Red = Negative Impact. Click a line to edit weight. Use Ctrl/Cmd + scroll to zoom, scroll to pan.
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
