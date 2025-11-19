'use client';

import { Box, Typography, Paper, TextField, IconButton, Button, Stack } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import { useState } from 'react';
import { Variable } from './VariablesTab';
import { Property } from './PropertiesTab';
import { validatePythonExpression, checkVariableReferences } from './ValidationUtils';
import { HighlightedExpression } from './DependencyPanel';
import { getConstraintDependencies } from './DependencyUtils';

export interface Constraint {
  expression: string;
  description: string;
}

interface ConstraintsTabProps {
  constraints: Constraint[];
  variables: Variable[];
  properties: Property[];
  onConstraintsChange: (constraints: Constraint[]) => void;
  onSaveHistory?: () => void;
  onUnsavedChanges?: () => void;
}

export function ConstraintsTab({ constraints, variables, properties, onConstraintsChange, onSaveHistory, onUnsavedChanges }: ConstraintsTabProps) {
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [editingConstraint, setEditingConstraint] = useState<Constraint | null>(null);

  const handleAddConstraint = () => {
    const newConstraint: Constraint = {
      expression: '',
      description: 'New constraint',
    };
    onConstraintsChange([...constraints, newConstraint]);
    setExpandedIndex(constraints.length); // Expand the new constraint
    setEditingConstraint(newConstraint);
    setTimeout(() => onSaveHistory?.(), 0); // Save to history
  };

  const handleFieldChange = (index: number, field: keyof Constraint, value: string) => {
    if (!editingConstraint) return;
    const updated = { ...editingConstraint };
    (updated as any)[field] = value;
    setEditingConstraint(updated);
  };

  const handleDeleteConstraint = (index: number) => {
    const updated = constraints.filter((_, i) => i !== index);
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
    onConstraintsChange(updated);
    
    if (expandedIndex === index) {
      setExpandedIndex(null);
      setEditingConstraint(null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
    
    setTimeout(() => onSaveHistory?.(), 0); // Save to history
  };

  const handleCollapseAndSave = (index: number) => {
    if (Object.keys(errors).length === 0 && editingConstraint) {
      const updated = [...constraints];
      updated[index] = editingConstraint;
      onConstraintsChange(updated);
      setExpandedIndex(null);
      setEditingConstraint(null);
      setTimeout(() => onSaveHistory?.(), 0); // Save to history when confirming
    }
  };
  
  const handleExpand = (index: number) => {
    setExpandedIndex(index);
    setEditingConstraint({ ...constraints[index] });
  };

  const handleExpressionChange = (index: number, newExpression: string) => {
    if (!editingConstraint) return;
    const updated = { ...editingConstraint, expression: newExpression };
    setEditingConstraint(updated);
    
    // Validate - constraints can reference variables and all properties
    const varNames = variables.map(v => v.name);
    const propNames = properties.map(p => p.name);
    const validNames = [...varNames, ...propNames];
    
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
  
  if (constraints.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No constraints defined yet. Constraints are rules that solutions must satisfy.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddConstraint}
          size="small"
        >
          Add Constraint
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={handleAddConstraint}
        size="small"
        sx={{ alignSelf: 'flex-start' }}
      >
        Add Constraint
      </Button>
      
      {constraints.map((constraint, idx) => {
        const isExpanded = expandedIndex === idx;
        const displayConstraint = isExpanded && editingConstraint ? editingConstraint : constraint;
        
        return (
          <Paper
            key={idx}
            elevation={1}
            sx={{
              p: 2,
              bgcolor: 'warning.50',
              borderLeft: 4,
              borderColor: 'warning.main',
            }}
          >
            {/* Collapsed view */}
            {!isExpanded && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Constraint {idx + 1}
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
                      onClick={() => handleDeleteConstraint(idx)}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, fontStyle: 'italic' }}>
                  {constraint.description}
                </Typography>
                <HighlightedExpression
                  expression={constraint.expression || '(empty)'}
                  variables={variables}
                  properties={properties}
                />
              </>
            )}

            {/* Expanded view */}
            {isExpanded && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary">
                    Edit Constraint
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
                      onClick={() => handleDeleteConstraint(idx)}
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
                    label="Description"
                    value={displayConstraint.description}
                    onChange={(e) => handleFieldChange(idx, 'description', e.target.value)}
                    multiline
                    rows={2}
                  />

                  <TextField
                    fullWidth
                    size="small"
                    label="Expression"
                    value={displayConstraint.expression}
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
