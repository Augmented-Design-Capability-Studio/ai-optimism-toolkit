'use client';

import { Box, Typography, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useGraphData } from './hooks/useGraphData';
import { useZoomPan } from './hooks/useZoomPan';
import { useWeightEditing } from './hooks/useWeightEditing';
import { calculateGraphLayout } from './utils/graphLayout';
import { ZoomControls } from './components/ZoomControls';
import { GraphSVG } from './components/GraphSVG';
import { WeightEditPopover } from './components/WeightEditPopover';
import { AddConnectionDialog } from './components/AddConnectionDialog';
import type { HeuristicNetworkProps } from './types';

export function HeuristicNetwork({ data, onWeightsChange }: HeuristicNetworkProps) {
    const localData = useGraphData(data);
    const {
        zoom,
        pan,
        isPanning,
        handleZoomIn,
        handleZoomOut,
        handleZoomReset,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel,
    } = useZoomPan();
    
    const {
        anchorEl,
        selectedEdge,
        addDialogOpen,
        newConnection,
        open,
        setAddDialogOpen,
        setNewConnection,
        handleEdgeClick,
        handleClose,
        handleWeightChange,
        handleSave,
        handleAddConnection,
        setQuickWeight,
    } = useWeightEditing(localData, onWeightsChange);

    if (!localData) {
        return <Box sx={{ p: 2 }}>Loading visualization...</Box>;
    }

    const layout = calculateGraphLayout(localData);

    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2, overflow: 'hidden', position: 'relative' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                    Interactive Heuristic Network
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <ZoomControls
                        zoom={zoom}
                        onZoomIn={handleZoomIn}
                        onZoomOut={handleZoomOut}
                        onReset={handleZoomReset}
                    />
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
                <GraphSVG
                    data={localData}
                    layout={layout}
                    zoom={zoom}
                    pan={pan}
                    isPanning={isPanning}
                    selectedEdge={selectedEdge}
                    onEdgeClick={handleEdgeClick}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onWheel={handleWheel}
                />
            </Box>
            
            <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary', display: 'block' }}>
                Green = Positive Impact, Red = Negative Impact. Click a line to edit weight. Scroll to pan, use zoom buttons to zoom.
            </Typography>

            <WeightEditPopover
                open={open}
                anchorEl={anchorEl}
                selectedEdge={selectedEdge}
                onClose={handleClose}
                onWeightChange={handleWeightChange}
                onSave={handleSave}
                onQuickWeight={setQuickWeight}
            />

            <AddConnectionDialog
                open={addDialogOpen}
                data={localData}
                newConnection={newConnection}
                onClose={() => setAddDialogOpen(false)}
                onConnectionChange={setNewConnection}
                onAdd={handleAddConnection}
            />
        </Box>
    );
}

