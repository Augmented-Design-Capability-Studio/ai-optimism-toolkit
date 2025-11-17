import React from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    List,
    ListItem,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    Checkbox,
    FormControlLabel,
    CircularProgress,
    IconButton,
    Tooltip
} from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon, AutoAwesome as AutoAwesomeIcon, Clear as ClearIcon } from '@mui/icons-material';
import type { Variable } from '../../services/api';

interface VariablesSectionProps {
    variables: Variable[];
    categoryInputs: { [index: number]: string };
    isGenerating: boolean;
    isConnected: boolean;
    problemName: string;
    onVariablesChange: (variables: Variable[]) => void;
    onCategoryInputChange: (index: number, value: string) => void;
    onGenerateVariables: () => void;
    onAddVariable: () => void;
    onRemoveVariable: (index: number) => void;
    onUpdateVariable: (index: number, field: keyof Variable, value: any) => void;
    onClearAll: () => void;
}

export const VariablesSection: React.FC<VariablesSectionProps> = ({
    variables,
    categoryInputs,
    isGenerating,
    isConnected,
    problemName,
    onGenerateVariables,
    onAddVariable,
    onRemoveVariable,
    onUpdateVariable,
    onCategoryInputChange,
    onClearAll
}) => {
    return (
        <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Variables</Typography>
                <Tooltip title={!isConnected ? "Connect to AI first" : "Generate variables with AI based on problem description"}>
                    <span>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={onGenerateVariables}
                            disabled={!isConnected || isGenerating || !problemName.trim()}
                            startIcon={isGenerating ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                        >
                            {isGenerating ? 'Generating...' : 'Generate Variables'}
                        </Button>
                    </span>
                </Tooltip>
            </Box>
            <List disablePadding sx={{ width: '100%' }}>
                {variables.map((variable, index) => (
                    <ListItem key={index} disablePadding sx={{ width: '100%', mb: 2 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 1, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                            <Box className="variable-fields">
                                <TextField
                                    className="variable-field"
                                    label="Name"
                                    value={variable.name}
                                    onChange={(e) => onUpdateVariable(index, 'name', e.target.value)}
                                    required
                                    size="small"
                                    sx={{
                                        '& .MuiInputBase-input': {
                                            fontFamily: 'monospace',
                                            fontWeight: 600,
                                            color: '#0066cc', // Blue for code
                                        }
                                    }}
                                />
                                <FormControl className="variable-field" size="small" required>
                                    <InputLabel>Type</InputLabel>
                                    <Select
                                        value={variable.type}
                                        label="Type"
                                        onChange={(e) => onUpdateVariable(index, 'type', e.target.value)}
                                    >
                                        <MenuItem value="numerical">Numerical</MenuItem>
                                        <MenuItem value="categorical">Categorical</MenuItem>
                                    </Select>
                                </FormControl>
                                <IconButton 
                                    onClick={() => onRemoveVariable(index)} 
                                    color="error"
                                    disabled={variables.length <= 1}
                                    sx={{ alignSelf: 'center' }}
                                >
                                    <RemoveIcon />
                                </IconButton>
                            </Box>

                            {variable.type === 'numerical' && (
                                <Box className="variable-fields">
                                    <TextField
                                        className="variable-field"
                                        label="Min"
                                        type="number"
                                        value={variable.min ?? 0}
                                        onChange={(e) => onUpdateVariable(index, 'min', e.target.value)}
                                        size="small"
                                    />
                                    <TextField
                                        className="variable-field"
                                        label="Max"
                                        type="number"
                                        value={variable.max ?? 100}
                                        onChange={(e) => onUpdateVariable(index, 'max', e.target.value)}
                                        size="small"
                                    />
                                    <TextField
                                        className="variable-field"
                                        label="Unit (optional)"
                                        value={variable.unit || ''}
                                        onChange={(e) => onUpdateVariable(index, 'unit', e.target.value)}
                                        size="small"
                                    />
                                </Box>
                            )}

                            {variable.type === 'categorical' && (
                                <Box>
                                    <TextField
                                        fullWidth
                                        label="Categories (comma-separated)"
                                        value={categoryInputs[index] || ''}
                                        onChange={(e) => onCategoryInputChange(index, e.target.value)}
                                        placeholder="e.g., red, blue, green"
                                        size="small"
                                        sx={{ 
                                            mb: 1,
                                            '& .MuiInputBase-input': {
                                                fontFamily: 'monospace',
                                                fontWeight: 600,
                                                color: '#0066cc', // Blue for code
                                            }
                                        }}
                                        helperText="Enter categories separated by commas"
                                    />
                                    {variable.categories && variable.categories.length > 0 && (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                                            {variable.categories.map((cat, catIndex) => (
                                                <Chip 
                                                    key={catIndex} 
                                                    label={cat} 
                                                    size="small"
                                                    sx={{
                                                        fontFamily: 'monospace',
                                                        fontWeight: 600,
                                                        color: '#0066cc',
                                                        backgroundColor: '#e3f2fd',
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                    )}
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={variable.modifier_strategy === 'cycle'}
                                                onChange={(e) => onUpdateVariable(index, 'modifier_strategy', e.target.checked ? 'cycle' : 'random')}
                                                size="small"
                                            />
                                        }
                                        label="Cycle through categories (uncheck for random)"
                                    />
                                </Box>
                            )}
                        </Box>
                    </ListItem>
                ))}
            </List>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                <Button 
                    startIcon={<ClearIcon />} 
                    onClick={onClearAll} 
                    size="small"
                    color="error"
                    variant="outlined"
                    disabled={variables.length === 0}
                >
                    Clear All
                </Button>
                <Button startIcon={<AddIcon />} onClick={onAddVariable} size="small">
                    Add Variable
                </Button>
            </Box>
        </Box>
    );
};
