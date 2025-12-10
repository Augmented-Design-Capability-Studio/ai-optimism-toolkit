import { useState } from 'react';
import type { Edge, HeuristicMapData } from '../types';

export function useWeightEditing(
    localData: HeuristicMapData | null,
    onWeightsChange?: (weights: Record<string, Record<string, number>>) => void
) {
    const [anchorEl, setAnchorEl] = useState<SVGElement | null>(null);
    const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newConnection, setNewConnection] = useState<{ obj: string; mod: string; weight: number }>({ 
        obj: '', 
        mod: '', 
        weight: 0.5 
    });

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
            const newData = { ...localData };
            if (!newData.weights[selectedEdge.obj]) {
                newData.weights[selectedEdge.obj] = {};
            }
            newData.weights[selectedEdge.obj][selectedEdge.mod] = selectedEdge.weight;
            
            if (onWeightsChange) {
                onWeightsChange(newData.weights);
            }
            
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
            
            if (onWeightsChange) {
                onWeightsChange(newData.weights);
            }
            
            setAddDialogOpen(false);
            setNewConnection(prev => ({ ...prev, obj: '', mod: '' }));
        }
    };

    const setQuickWeight = (val: number) => {
        if (selectedEdge) {
            setSelectedEdge({ ...selectedEdge, weight: val });
        }
    };

    return {
        anchorEl,
        selectedEdge,
        addDialogOpen,
        newConnection,
        open: Boolean(anchorEl),
        setAddDialogOpen,
        setNewConnection,
        handleEdgeClick,
        handleClose,
        handleWeightChange,
        handleSave,
        handleAddConnection,
        setQuickWeight,
    };
}

