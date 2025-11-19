'use client';

import { Box, Typography, Paper, TextField, IconButton, Button, Stack } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import { useState } from 'react';
import { Variable } from './VariablesTab';
import { validatePythonExpression, checkVariableReferences } from './ValidationUtils';
import { DependencyPanel, HighlightedExpression } from './DependencyPanel';
import { getPropertyDependencies } from './DependencyUtils';
import { Objective } from './ObjectivesTab';
import { Constraint } from './ConstraintsTab';

export interface Property {
  name: string;
  expression: string;
  description: string;
}

interface PropertiesTabProps {
  properties: Property[];
  variables: Variable[];
  onPropertiesChange: (properties: Property[]) => void;
  onSaveHistory?: () => void;
  onUnsavedChanges?: () => void;
  objectives?: Objective[];
  constraints?: Constraint[];
  onNavigateToTab?: (tab: number, index: number) => void;
}

export function PropertiesTab({ properties, variables, onPropertiesChange, onSaveHistory, onUnsavedChanges, objectives = [], constraints = [], onNavigateToTab }: PropertiesTabProps) {
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const handleAddProperty = () => {
    const newProperty: Property = {
      name: `property_${properties.length + 1}`,
      expression: '',
      description: 'New property',
    };
    onPropertiesChange([...properties, newProperty]);
    setExpandedIndex(properties.length); // Expand the new property
    setEditingProperty(newProperty);
    setTimeout(() => onSaveHistory?.(), 0); // Save to history
  };

  const handleFieldChange = (index: number, field: keyof Property, value: string) => {
    if (!editingProperty) return;
    const updated = { ...editingProperty };
    (updated as any)[field] = value;
    setEditingProperty(updated);
  };

  const handleDeleteProperty = (index: number) => {
    const updated = properties.filter((_, i) => i !== index);
    const newErrors = { ...errors };
    delete newErrors[index];
    // Reindex errors
    const reindexedErrors: Record<number, string> = {};
    Object.keys(newErrors).forEach(key => {
      const idx = parseInt(key);
      if (idx > index) {
        reindexedErrors[idx - 1] = newErrors[idx];
      } else {
        reindexedErrors[idx] = newErrors[idx];
      }
    });
    setErrors(reindexedErrors);
    onPropertiesChange(updated);
    
    if (expandedIndex === index) {
      setExpandedIndex(null);
      setEditingProperty(null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
    
    setTimeout(() => onSaveHistory?.(), 0); // Save to history
  };

  const handleCollapseAndSave = (index: number) => {
    if (Object.keys(errors).length === 0 && editingProperty) {
      const updated = [...properties];
      updated[index] = editingProperty;
      onPropertiesChange(updated);
      setExpandedIndex(null);
      setEditingProperty(null);
      setTimeout(() => onSaveHistory?.(), 0); // Save to history when confirming
    }
  };
  
  const handleExpand = (index: number) => {
    setExpandedIndex(index);
    setEditingProperty({ ...properties[index] });
  };

  const handleExpressionChange = (index: number, newExpression: string) => {
    if (!editingProperty) return;
    const updated = { ...editingProperty, expression: newExpression };
    setEditingProperty(updated);
    
    // Validate - properties can reference variables and earlier properties
    const varNames = variables.map(v => v.name);
    const priorPropNames = properties.slice(0, index).map(p => p.name);
    const validNames = [...varNames, ...priorPropNames];
    
    const newErrors = { ...errors };
    if (!validatePythonExpression(newExpression)) {
      newErrors[index] = 'Invalid expression syntax';
    } else {
      const undefinedVars = checkVariableReferences(newExpression, validNames);
      if (undefinedVars.length > 0) {
        newErrors[index] = `Undefined: ${undefinedVars.join(', ')}`;
      } else {
        delete newErrors[index];
      }
    }
    
    setErrors(newErrors);
  };
  if (properties.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No properties defined yet. Properties are values calculated from variables.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddProperty}
          size="small"
        >
          Add Property
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={handleAddProperty}
        size="small"
        sx={{ alignSelf: 'flex-start' }}
      >
        Add Property
      </Button>
      
      {properties.map((property, idx) => {
        const isExpanded = expandedIndex === idx;
        const displayProperty = isExpanded && editingProperty ? editingProperty : property;
        
        return (
          <Paper key={idx} elevation={1} sx={{ p: 2, bgcolor: 'grey.50' }}>
            {/* Collapsed view */}
            {!isExpanded && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                    {property.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton 
                      size="small" 
                      onClick={() => handleExpand(idx)}
                      color="primary"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleDeleteProperty(idx)}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, fontStyle: 'italic' }}>
                  {property.description}
                </Typography>
                <HighlightedExpression
                  expression={property.expression || '(empty)'}
                  variables={variables}
                  properties={properties.slice(0, idx)}
                />
                
                {/* Dependency info */}
                <DependencyPanel
                  dependencies={getPropertyDependencies(idx, properties, variables, objectives, constraints)}
                  onNavigate={(type, index) => {
                    const tabMap: Record<string, number> = { property: 1, objective: 2, constraint: 3 };
                    onNavigateToTab?.(tabMap[type], index);
                  }}
                />
              </>
            )}

            {/* Expanded view */}
            {isExpanded && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary">
                    Edit Property
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton 
                      size="small" 
                      onClick={() => handleCollapseAndSave(idx)}
                      color="success"
                    >
                      <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleDeleteProperty(idx)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Name"
                    value={displayProperty.name}
                    onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                    sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace' } }}
                  />

                  <TextField
                    fullWidth
                    size="small"
                    label="Description"
                    value={displayProperty.description}
                    onChange={(e) => handleFieldChange(idx, 'description', e.target.value)}
                    multiline
                    rows={2}
                  />

                  <TextField
                    fullWidth
                    size="small"
                    label="Expression"
                    value={displayProperty.expression}
                    onChange={(e) => handleExpressionChange(idx, e.target.value)}
                    error={!!errors[idx]}
                    helperText={errors[idx]}
                    sx={{
                      '& .MuiInputBase-input': {
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                      },
                    }}
                  />
                </Stack>
              </>
            )}
          </Paper>
        );
      })}
    </Box>
  );
}
