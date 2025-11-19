'use client';

import { Box, Typography, Paper, TextField, IconButton, Button, Chip, Stack } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import { useState } from 'react';
import { Variable } from './VariablesTab';
import { Property } from './PropertiesTab';
import { validatePythonExpression, checkVariableReferences } from './ValidationUtils';
import { HighlightedExpression } from './DependencyPanel';
import { getObjectiveDependencies } from './DependencyUtils';

export interface Objective {
  name: string;
  expression: string;
  goal: 'minimize' | 'maximize';
  description: string;
}

interface ObjectivesTabProps {
  objectives: Objective[];
  variables: Variable[];
  properties: Property[];
  onObjectivesChange: (objectives: Objective[]) => void;
  onSaveHistory?: () => void;
  onUnsavedChanges?: () => void;
}

export function ObjectivesTab({ objectives, variables, properties, onObjectivesChange, onSaveHistory, onUnsavedChanges }: ObjectivesTabProps) {
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);

  const handleAddObjective = () => {
    const newObjective: Objective = {
      name: `objective_${objectives.length + 1}`,
      expression: '',
      goal: 'maximize',
      description: 'New objective',
    };
    onObjectivesChange([...objectives, newObjective]);
    setExpandedIndex(objectives.length); // Expand the new objective
    setEditingObjective(newObjective);
    setTimeout(() => onSaveHistory?.(), 0); // Save to history
  };

  const handleDeleteObjective = (index: number) => {
    const updated = objectives.filter((_, i) => i !== index);
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
    onObjectivesChange(updated);
    
    if (expandedIndex === index) {
      setExpandedIndex(null);
      setEditingObjective(null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
    
    setTimeout(() => onSaveHistory?.(), 0); // Save to history
  };

  const handleFieldChange = (index: number, field: keyof Objective, value: string) => {
    if (!editingObjective) return;
    const updated = { ...editingObjective };
    (updated as any)[field] = value;
    setEditingObjective(updated);
  };

  const handleCollapseAndSave = (index: number) => {
    if (Object.keys(errors).length === 0 && editingObjective) {
      const updated = [...objectives];
      updated[index] = editingObjective;
      onObjectivesChange(updated);
      setExpandedIndex(null);
      setEditingObjective(null);
      setTimeout(() => onSaveHistory?.(), 0); // Save to history when confirming
    }
  };
  
  const handleExpand = (index: number) => {
    setExpandedIndex(index);
    setEditingObjective({ ...objectives[index] });
  };

  const handleExpressionChange = (index: number, newExpression: string) => {
    if (!editingObjective) return;
    const updated = { ...editingObjective, expression: newExpression };
    setEditingObjective(updated);
    
    // Validate
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
  if (objectives.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No objectives defined yet. Objectives define what you want to optimize.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddObjective}
          size="small"
        >
          Add Objective
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={handleAddObjective}
        size="small"
        sx={{ alignSelf: 'flex-start' }}
      >
        Add Objective
      </Button>
      
      {objectives.map((objective, idx) => {
        const isExpanded = expandedIndex === idx;
        const displayObjective = isExpanded && editingObjective ? editingObjective : objective;
        
        return (
          <Paper key={idx} elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            {/* Collapsed view */}
            {!isExpanded && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {objective.name}
                    </Typography>
                    <Chip
                      label={objective.goal.toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: objective.goal === 'maximize' ? 'success.main' : 'info.main',
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    />
                  </Box>
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
                      onClick={() => handleDeleteObjective(idx)}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, fontStyle: 'italic' }}>
                  {objective.description}
                </Typography>
                <HighlightedExpression
                  expression={objective.expression || '(empty)'}
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
                    Edit Objective
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
                      onClick={() => handleDeleteObjective(idx)}
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
                    value={displayObjective.name}
                    onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                    sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace' } }}
                  />
                  
                  <TextField
                    select
                    size="small"
                    label="Goal"
                    value={displayObjective.goal}
                    onChange={(e) => handleFieldChange(idx, 'goal', e.target.value as 'minimize' | 'maximize')}
                    SelectProps={{ native: true }}
                  >
                    <option value="maximize">Maximize</option>
                    <option value="minimize">Minimize</option>
                  </TextField>

                  <TextField
                    fullWidth
                    size="small"
                    label="Description"
                    value={displayObjective.description}
                    onChange={(e) => handleFieldChange(idx, 'description', e.target.value)}
                    multiline
                    rows={2}
                  />

                  <TextField
                    fullWidth
                    size="small"
                    label="Expression"
                    value={displayObjective.expression}
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
