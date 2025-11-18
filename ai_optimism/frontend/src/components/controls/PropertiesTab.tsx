'use client';

import { Box, Typography, Paper, TextField } from '@mui/material';
import { useState } from 'react';
import { Variable } from './VariablesTab';
import { validatePythonExpression, checkVariableReferences } from './ValidationUtils';

export interface Property {
  name: string;
  expression: string;
  description: string;
}

interface PropertiesTabProps {
  properties: Property[];
  variables: Variable[];
  onPropertiesChange: (properties: Property[]) => void;
}

export function PropertiesTab({ properties, variables, onPropertiesChange }: PropertiesTabProps) {
  const [errors, setErrors] = useState<Record<number, string>>({});

  const handleExpressionChange = (index: number, newExpression: string) => {
    const updated = [...properties];
    updated[index].expression = newExpression;
    
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
    onPropertiesChange(updated);
  };
  if (properties.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
        No properties defined yet. Properties are values calculated from variables.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {properties.map((property, idx) => (
        <Paper key={idx} elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            {property.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            {property.description}
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={property.expression}
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
        </Paper>
      ))}
    </Box>
  );
}
