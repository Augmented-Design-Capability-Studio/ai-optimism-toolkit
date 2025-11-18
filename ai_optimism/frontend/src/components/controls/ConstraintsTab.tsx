'use client';

import { Box, Typography, Paper, TextField } from '@mui/material';
import { useState } from 'react';
import { Variable } from './VariablesTab';
import { Property } from './PropertiesTab';
import { validatePythonExpression, checkVariableReferences } from './ValidationUtils';

export interface Constraint {
  expression: string;
  description: string;
}

interface ConstraintsTabProps {
  constraints: Constraint[];
  variables: Variable[];
  properties: Property[];
  onConstraintsChange: (constraints: Constraint[]) => void;
}

export function ConstraintsTab({ constraints, variables, properties, onConstraintsChange }: ConstraintsTabProps) {
  const [errors, setErrors] = useState<Record<number, string>>({});

  const handleExpressionChange = (index: number, newExpression: string) => {
    const updated = [...constraints];
    updated[index].expression = newExpression;
    
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
    onConstraintsChange(updated);
  };
  if (constraints.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
        No constraints defined yet. Constraints are rules that solutions must satisfy.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {constraints.map((constraint, idx) => (
        <Paper
          key={idx}
          elevation={0}
          sx={{
            p: 2,
            bgcolor: 'warning.50',
            borderLeft: 4,
            borderColor: 'warning.main',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold">
              Constraint {idx + 1}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            {constraint.description}
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={constraint.expression}
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
