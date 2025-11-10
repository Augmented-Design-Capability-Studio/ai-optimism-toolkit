import React from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    List,
    ListItem,
    IconButton,
    CircularProgress,
    Alert,
    Tooltip
} from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon, AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';

interface ConstraintsSectionProps {
    constraints: string[];
    isGenerating: boolean;
    isConnected: boolean;
    hasVariables: boolean;
    error?: string | null;
    onConstraintsChange: (constraints: string[]) => void;
    onGenerate: () => void;
    onAddConstraint: () => void;
    onRemoveConstraint: (index: number) => void;
    onUpdateConstraint: (index: number, value: string) => void;
}

export const ConstraintsSection: React.FC<ConstraintsSectionProps> = ({
    constraints,
    isGenerating,
    isConnected,
    hasVariables,
    error,
    onGenerate,
    onAddConstraint,
    onRemoveConstraint,
    onUpdateConstraint
}) => {
    return (
        <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Constraints</Typography>
                <Tooltip title={!isConnected ? "Connect to AI first" : !hasVariables ? "Add variables first" : "Generate constraints based on variables and properties"}>
                    <span>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={onGenerate}
                            disabled={!isConnected || isGenerating || !hasVariables}
                            startIcon={isGenerating ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                        >
                            {isGenerating ? 'Generating...' : 'Generate Constraints'}
                        </Button>
                    </span>
                </Tooltip>
            </Box>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            )}
            <List disablePadding sx={{ width: '100%' }}>
                {constraints.map((constraint, index) => (
                    <ListItem key={index} disablePadding sx={{ width: '100%', mb: 1 }}>
                        <TextField
                            fullWidth
                            className="constraint-field"
                            label={`Constraint ${index + 1}`}
                            value={constraint}
                            onChange={(e) => onUpdateConstraint(index, e.target.value)}
                            placeholder="e.g., total_cost <= budget"
                            sx={{
                                '& .MuiInputBase-input': {
                                    fontFamily: 'monospace',
                                    fontWeight: 600,
                                }
                            }}
                        />
                        <IconButton onClick={() => onRemoveConstraint(index)} color="error">
                            <RemoveIcon />
                        </IconButton>
                    </ListItem>
                ))}
            </List>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button startIcon={<AddIcon />} onClick={onAddConstraint} size="small">
                    Add Constraint
                </Button>
            </Box>
        </Box>
    );
};
