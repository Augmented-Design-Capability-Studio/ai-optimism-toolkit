import React from 'react';
import {
    Box,
    Button,
    Typography,
    List,
    ListItem,
    CircularProgress,
    Alert,
    Tooltip,
    TextField,
    IconButton
} from '@mui/material';
import { AutoAwesome as AutoAwesomeIcon, Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';

interface PropertiesSectionProps {
    properties: Array<{name: string, expression: string, description: string}>;
    isGenerating: boolean;
    isConnected: boolean;
    hasVariables: boolean;
    error?: string | null;
    onGenerateProperties: () => void;
    onAddProperty: () => void;
    onRemoveProperty: (index: number) => void;
    onUpdateProperty: (index: number, field: 'name' | 'expression' | 'description', value: string) => void;
}

export const PropertiesSection: React.FC<PropertiesSectionProps> = ({
    properties,
    isGenerating,
    isConnected,
    hasVariables,
    error,
    onGenerateProperties,
    onAddProperty,
    onRemoveProperty,
    onUpdateProperty
}) => {
    return (
        <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Properties (Optional)</Typography>
                <Tooltip title={!isConnected ? "Connect to AI first" : !hasVariables ? "Add variables first" : "Generate computed properties based on variables"}>
                    <span>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={onGenerateProperties}
                            disabled={!isConnected || isGenerating || !hasVariables}
                            startIcon={isGenerating ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                        >
                            {isGenerating ? 'Generating...' : 'Generate Properties'}
                        </Button>
                    </span>
                </Tooltip>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Define computed attributes derived from variables (e.g., total_cost = price * quantity)
            </Typography>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            )}
            <List disablePadding sx={{ width: '100%' }}>
                {properties.map((property, index) => (
                    <ListItem key={index} disablePadding sx={{ width: '100%', mb: 2 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 1, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                <TextField
                                    label="Name"
                                    value={property.name}
                                    onChange={(e) => onUpdateProperty(index, 'name', e.target.value)}
                                    required
                                    size="small"
                                    sx={{ 
                                        flex: 1,
                                        '& .MuiInputBase-input': {
                                            fontFamily: 'monospace',
                                            fontWeight: 600,
                                        }
                                    }}
                                />
                                <TextField
                                    label="Expression"
                                    value={property.expression}
                                    onChange={(e) => onUpdateProperty(index, 'expression', e.target.value)}
                                    required
                                    size="small"
                                    sx={{ 
                                        flex: 2,
                                        '& .MuiInputBase-input': {
                                            fontFamily: 'monospace',
                                            fontWeight: 600,
                                        }
                                    }}
                                    placeholder="e.g., price * quantity"
                                />
                                <IconButton 
                                    onClick={() => onRemoveProperty(index)} 
                                    color="error"
                                    disabled={properties.length <= 0}
                                    sx={{ alignSelf: 'center' }}
                                >
                                    <RemoveIcon />
                                </IconButton>
                            </Box>
                            <TextField
                                label="Description"
                                value={property.description}
                                onChange={(e) => onUpdateProperty(index, 'description', e.target.value)}
                                size="small"
                                fullWidth
                                placeholder="Brief explanation of this property"
                            />
                        </Box>
                    </ListItem>
                ))}
            </List>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                    startIcon={<AddIcon />}
                    onClick={onAddProperty}
                    size="small"
                >
                    Add Property
                </Button>
            </Box>
        </Box>
    );
};
