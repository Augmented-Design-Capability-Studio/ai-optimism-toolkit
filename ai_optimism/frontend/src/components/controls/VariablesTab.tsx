'use client';

import { Box, Typography, Paper, Slider, TextField, Stack } from '@mui/material';
import { useState } from 'react';

export interface Variable {
  name: string;
  type: 'continuous' | 'discrete';
  min: number;
  max: number;
  default: number;
  unit?: string;
  description: string;
}

interface VariablesTabProps {
  variables: Variable[];
  values: Record<string, number>;
  onValueChange: (name: string, value: number) => void;
  onVariablesChange?: (variables: Variable[]) => void;
  onVariableNameChange?: (oldName: string, newName: string) => void;
}

export function VariablesTab({ 
  variables, 
  values, 
  onValueChange,
  onVariablesChange,
  onVariableNameChange
}: VariablesTabProps) {
  const [errors, setErrors] = useState<Record<number, { field: string; message: string }>>({});

  const handleVariableChange = (index: number, field: keyof Variable, value: string | number) => {
    const updated = [...variables];
    const oldName = updated[index].name;
    
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
        (updated[index] as any)[field] = value;
        onVariablesChange?.(updated);
        if (oldName !== newName) {
          onVariableNameChange?.(oldName, newName);
        }
      }
    } else if (field === 'min' || field === 'max') {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numValue)) {
        newErrors[index] = { field, message: 'Must be a number' };
      } else {
        (updated[index] as any)[field] = numValue;
        
        // Validate range
        if (field === 'min' && numValue >= updated[index].max) {
          newErrors[index] = { field: 'min', message: 'Min must be less than max' };
        } else if (field === 'max' && numValue <= updated[index].min) {
          newErrors[index] = { field: 'max', message: 'Max must be greater than min' };
        } else {
          onVariablesChange?.(updated);
        }
      }
    } else {
      (updated[index] as any)[field] = value;
      onVariablesChange?.(updated);
    }
    
    setErrors(newErrors);
  };

  if (variables.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
        No variables defined yet. Use the chat to describe your optimization problem.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {variables.map((variable, idx) => (
        <Paper key={idx} elevation={1} sx={{ p: 2 }}>
          {/* Variable metadata editing */}
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Variable Name"
              value={variable.name}
              onChange={(e) => handleVariableChange(idx, 'name', e.target.value)}
              error={errors[idx]?.field === 'name'}
              helperText={errors[idx]?.field === 'name' ? errors[idx].message : ''}
              sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace' }, flex: 2 }}
            />
            <TextField
              size="small"
              label="Unit"
              value={variable.unit || ''}
              onChange={(e) => handleVariableChange(idx, 'unit', e.target.value)}
              placeholder="Optional"
              sx={{ flex: 1 }}
            />
            <TextField
              select
              size="small"
              label="Type"
              value={variable.type}
              onChange={(e) => handleVariableChange(idx, 'type', e.target.value)}
              SelectProps={{ native: true }}
              sx={{ flex: 1 }}
            >
              <option value="continuous">Continuous</option>
              <option value="discrete">Discrete</option>
            </TextField>
          </Stack>

          <TextField
            fullWidth
            size="small"
            label="Description"
            value={variable.description}
            onChange={(e) => handleVariableChange(idx, 'description', e.target.value)}
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />

          {/* Range editing */}
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Min"
              type="number"
              value={variable.min}
              onChange={(e) => handleVariableChange(idx, 'min', e.target.value)}
              error={errors[idx]?.field === 'min'}
              helperText={errors[idx]?.field === 'min' ? errors[idx].message : ''}
            />
            <TextField
              fullWidth
              size="small"
              label="Max"
              type="number"
              value={variable.max}
              onChange={(e) => handleVariableChange(idx, 'max', e.target.value)}
              error={errors[idx]?.field === 'max'}
              helperText={errors[idx]?.field === 'max' ? errors[idx].message : ''}
            />
          </Stack>

          {/* Current value slider */}
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Current Value
          </Typography>
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
        </Paper>
      ))}
    </Box>
  );
}
