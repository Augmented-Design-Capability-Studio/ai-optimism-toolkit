'use client';

import { Box, Typography, Paper, Slider, TextField, Stack, IconButton, Collapse, Chip, Button } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useState } from 'react';
import { DependencyPanel } from './DependencyPanel';
import { getVariableDependencies } from './DependencyUtils';
import { Property } from './PropertiesTab';
import { Objective } from './ObjectivesTab';
import { Constraint } from './ConstraintsTab';

export interface Variable {
  name: string;
  type: 'continuous' | 'discrete' | 'categorical';
  min: number;
  max: number;
  default: number;
  unit?: string;
  description: string;
  // For categorical variables
  categories?: string[];
  currentCategory?: string;
}

interface VariablesTabProps {
  variables: Variable[];
  values: Record<string, number>;
  onValueChange: (name: string, value: number) => void;
  onVariablesChange?: (variables: Variable[]) => void;
  onVariableNameChange?: (oldName: string, newName: string) => void;
  onSaveHistory?: () => void;
  onUnsavedChanges?: () => void;
  properties?: Property[];
  objectives?: Objective[];
  constraints?: Constraint[];
  onNavigateToTab?: (tab: number, index: number) => void;
}

export function VariablesTab({ 
  variables, 
  values, 
  onValueChange,
  onVariablesChange,
  onVariableNameChange,
  onSaveHistory,
  onUnsavedChanges,
  properties = [],
  objectives = [],
  constraints = [],
  onNavigateToTab
}: VariablesTabProps) {
  const [errors, setErrors] = useState<Record<number, { field: string; message: string }>>({});
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null);

  const handleAddVariable = () => {
    const newVariable: Variable = {
      name: `var_${variables.length + 1}`,
      type: 'continuous',
      min: 0,
      max: 100,
      default: 50,
      unit: '',
      description: 'New variable',
    };
    onVariablesChange?.([...variables, newVariable]);
    setExpandedIndex(variables.length); // Expand the new variable
    setEditingVariable(newVariable); // Start editing the new variable
    setTimeout(() => onSaveHistory?.(), 0); // Save to history after adding
  };

  const handleDeleteVariable = (index: number) => {
    const variableToDelete = variables[index];
    const updated = variables.filter((_, i) => i !== index);
    onVariablesChange?.(updated);
    
    // Notify parent about name removal (it will clean up expressions)
    if (onVariableNameChange) {
      onVariableNameChange(variableToDelete.name, '');
    }
    
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
    
    setTimeout(() => onSaveHistory?.(), 0); // Save to history after deleting
  };

  const handleVariableChange = (index: number, field: keyof Variable, value: string | number | string[]) => {
    if (!editingVariable) return;
    
    const updated = { ...editingVariable };
    
    // Validate
    const newErrors = { ...errors };
    delete newErrors[index];
    
    if (field === 'name') {
      const newName = value as string;
      if (!newName.trim()) {
        newErrors[index] = { field, message: 'Name cannot be empty' };
      } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newName)) {
        newErrors[index] = { field, message: 'Must be valid identifier (letters, numbers, underscore)' };
      } else if (variables.some((v, i) => i !== index && v.name === newName)) {
        newErrors[index] = { field, message: 'Name already exists' };
      }
      
      if (!newErrors[index]) {
        (updated as any)[field] = value;
        setEditingVariable(updated);
      }
    } else if (field === 'min' || field === 'max') {
      const numValue = typeof value === 'string' ? parseFloat(value) : (typeof value === 'number' ? value : NaN);
      if (isNaN(numValue)) {
        newErrors[index] = { field, message: 'Must be a number' };
      } else {
        (updated as any)[field] = numValue;
        
        // Validate range
        if (field === 'min' && numValue >= updated.max) {
          newErrors[index] = { field: 'min', message: 'Min must be less than max' };
        } else if (field === 'max' && numValue <= updated.min) {
          newErrors[index] = { field: 'max', message: 'Max must be greater than min' };
        } else {
          setEditingVariable(updated);
        }
      }
    } else {
      (updated as any)[field] = value;
      setEditingVariable(updated);
    }
    
    setErrors(newErrors);
  };

  const handleCollapseAndSave = (index: number) => {
    if (Object.keys(errors).length === 0 && editingVariable) {
      const oldVariable = variables[index];
      const updated = [...variables];
      updated[index] = editingVariable;
      onVariablesChange?.(updated);
      
      // Handle name change propagation
      if (oldVariable.name !== editingVariable.name) {
        onVariableNameChange?.(oldVariable.name, editingVariable.name);
      }
      
      setExpandedIndex(null);
      setEditingVariable(null);
      setTimeout(() => onSaveHistory?.(), 0); // Save to history when confirming edit
    }
  };
  
  const handleExpand = (index: number) => {
    setExpandedIndex(index);
    setEditingVariable({ ...variables[index] }); // Create a copy for editing
  };
  
  const handleCancelEdit = () => {
    setExpandedIndex(null);
    setEditingVariable(null);
    setErrors({});
  };

  if (variables.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No variables defined yet. Use the chat to describe your optimization problem.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddVariable}
          size="small"
        >
          Add Variable
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={handleAddVariable}
        size="small"
        sx={{ alignSelf: 'flex-start' }}
      >
        Add Variable
      </Button>
      
      {variables.map((variable, idx) => {
        const isExpanded = expandedIndex === idx;
        const displayVariable = isExpanded && editingVariable ? editingVariable : variable;
        
        return (
          <Paper key={idx} elevation={1} sx={{ p: 2 }}>
            {/* Collapsed view - Compact display with slider */}
            {!isExpanded && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                      {variable.name}
                    </Typography>
                    {variable.unit && (
                      <Chip label={variable.unit} size="small" variant="outlined" />
                    )}
                    <Chip 
                      label={variable.type} 
                      size="small" 
                      color={variable.type === 'continuous' ? 'primary' : variable.type === 'discrete' ? 'secondary' : 'success'}
                      variant="outlined"
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
                      onClick={() => handleDeleteVariable(idx)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                
                {variable.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                    {variable.description}
                  </Typography>
                )}

                {/* Current value - slider for continuous/discrete, dropdown for categorical */}
                {variable.type === 'categorical' ? (
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Current Value"
                    value={variable.currentCategory || variable.categories?.[0] || ''}
                    onChange={(e) => {
                      const updated = [...variables];
                      updated[idx] = { ...updated[idx], currentCategory: e.target.value };
                      onVariablesChange?.(updated);
                    }}
                    SelectProps={{ native: true }}
                    disabled={!variable.categories || variable.categories.length === 0}
                  >
                    {variable.categories && variable.categories.length > 0 ? (
                      variable.categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))
                    ) : (
                      <option value="">No categories defined</option>
                    )}
                  </TextField>
                ) : (
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Slider
                      value={values[variable.name] ?? variable.default ?? variable.min}
                      onChange={(_, value) => onValueChange(variable.name, Array.isArray(value) ? value[0] : value)}
                      min={variable.min}
                      max={variable.max}
                      step={variable.type === 'discrete' ? 1 : (variable.max - variable.min) / 100}
                      marks={[
                        { value: variable.min, label: variable.min.toString() },
                        { value: variable.max, label: variable.max.toString() },
                      ]}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      value={values[variable.name] ?? variable.default ?? variable.min}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                          onValueChange(variable.name, value);
                        }
                      }}
                      type="number"
                      size="small"
                      sx={{ width: 100 }}
                      inputProps={{
                        min: variable.min,
                        max: variable.max,
                        step: variable.type === 'discrete' ? 1 : 'any',
                      }}
                    />
                  </Box>
                )}
                
                {/* Dependency info */}
                <DependencyPanel
                  dependencies={getVariableDependencies(variable.name, properties, objectives, constraints)}
                  onNavigate={(type, index) => {
                    const tabMap: Record<string, number> = { property: 1, objective: 2, constraint: 3 };
                    onNavigateToTab?.(tabMap[type], index);
                  }}
                />
              </>
            )}

            {/* Expanded view - Full editable form */}
            {isExpanded && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary">
                    Edit Variable
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
                      onClick={() => handleDeleteVariable(idx)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                {/* Variable metadata editing */}
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Variable Name"
                    value={displayVariable.name}
                    onChange={(e) => handleVariableChange(idx, 'name', e.target.value)}
                    error={errors[idx]?.field === 'name'}
                    helperText={errors[idx]?.field === 'name' ? errors[idx].message : ''}
                    sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace' }, flex: 2 }}
                  />
                  <TextField
                    size="small"
                    label="Unit"
                    value={displayVariable.unit || ''}
                    onChange={(e) => handleVariableChange(idx, 'unit', e.target.value)}
                    placeholder="Optional"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    select
                    size="small"
                    label="Type"
                    value={displayVariable.type}
                    onChange={(e) => handleVariableChange(idx, 'type', e.target.value)}
                    SelectProps={{ native: true }}
                    sx={{ flex: 1 }}
                  >
                    <option value="continuous">Continuous</option>
                    <option value="discrete">Discrete</option>
                    <option value="categorical">Categorical</option>
                  </TextField>
                </Stack>

                <TextField
                  fullWidth
                  size="small"
                  label="Description"
                  value={displayVariable.description}
                  onChange={(e) => handleVariableChange(idx, 'description', e.target.value)}
                  multiline
                  rows={2}
                  sx={{ mb: 2 }}
                />

                {/* Categorical-specific: Categories input */}
                {displayVariable.type === 'categorical' && (
                  <TextField
                    fullWidth
                    size="small"
                    label="Categories (comma-separated)"
                    value={displayVariable.categories?.join(', ') || ''}
                    onChange={(e) => {
                      const categories = e.target.value.split(',').map(c => c.trim()).filter(c => c);
                      handleVariableChange(idx, 'categories', categories);
                    }}
                    placeholder="e.g., red, blue, green"
                    helperText="Enter category names separated by commas"
                    sx={{ mb: 2 }}
                  />
                )}

                {/* Range editing (only for continuous/discrete) */}
                {displayVariable.type !== 'categorical' && (
                  <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Min"
                      type="number"
                      value={displayVariable.min}
                      onChange={(e) => handleVariableChange(idx, 'min', e.target.value)}
                      error={errors[idx]?.field === 'min'}
                      helperText={errors[idx]?.field === 'min' ? errors[idx].message : ''}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Max"
                      type="number"
                      value={displayVariable.max}
                      onChange={(e) => handleVariableChange(idx, 'max', e.target.value)}
                      error={errors[idx]?.field === 'max'}
                      helperText={errors[idx]?.field === 'max' ? errors[idx].message : ''}
                    />
                  </Stack>
                )}

                {/* Current value - slider for continuous/discrete, dropdown for categorical */}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Current Value
                </Typography>
                {displayVariable.type === 'categorical' ? (
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={variable.currentCategory || displayVariable.categories?.[0] || ''}
                    onChange={(e) => {
                      const updated = [...variables];
                      updated[idx] = { ...updated[idx], currentCategory: e.target.value };
                      onVariablesChange?.(updated);
                    }}
                    SelectProps={{ native: true }}
                    disabled={!displayVariable.categories || displayVariable.categories.length === 0}
                  >
                    {displayVariable.categories && displayVariable.categories.length > 0 ? (
                      displayVariable.categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))
                    ) : (
                      <option value="">No categories defined</option>
                    )}
                  </TextField>
                ) : (
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Slider
                    value={values[variable.name] ?? variable.default ?? variable.min}
                    onChange={(_, value) => onValueChange(variable.name, Array.isArray(value) ? value[0] : value)}
                    min={variable.min}
                    max={variable.max}
                    step={variable.type === 'discrete' ? 1 : (variable.max - variable.min) / 100}
                    marks={[
                      { value: variable.min, label: variable.min.toString() },
                      { value: variable.max, label: variable.max.toString() },
                    ]}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    value={values[variable.name] ?? variable.default ?? variable.min}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        onValueChange(variable.name, value);
                      }
                    }}
                    type="number"
                    size="small"
                    sx={{ width: 100 }}
                    inputProps={{
                      min: variable.min,
                      max: variable.max,
                      step: variable.type === 'discrete' ? 1 : 'any',
                    }}
                  />
                </Box>
                )}
              </>
            )}
          </Paper>
        );
      })}
    </Box>
  );
}
