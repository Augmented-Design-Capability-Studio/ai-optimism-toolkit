'use client';

import { Box, Typography, Paper, TextField, Alert } from '@mui/material';
import { useState } from 'react';
import { Variable } from './VariablesTab';
import { Property } from './PropertiesTab';
import { validatePythonExpression, checkVariableReferences } from './ValidationUtils';

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
}

export function ObjectivesTab({ objectives, variables, properties, onObjectivesChange }: ObjectivesTabProps) {
  const [errors, setErrors] = useState<Record<number, string>>({});

  const handleExpressionChange = (index: number, newExpression: string) => {
    const updated = [...objectives];
    updated[index].expression = newExpression;
    
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
    onObjectivesChange(updated);
  };
  if (objectives.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
        No objectives defined yet. Objectives define what you want to optimize.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {objectives.map((objective, idx) => (
        <Paper
          key={idx}
          elevation={0}
          sx={{
            p: 2,
            bgcolor: objective.goal === 'maximize' ? 'success.50' : 'info.50',
            borderLeft: 4,
            borderColor: objective.goal === 'maximize' ? 'success.main' : 'info.main',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold">
              {objective.name}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: objective.goal === 'maximize' ? 'success.main' : 'info.main',
                color: 'white',
              }}
            >
              {objective.goal.toUpperCase()}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            {objective.description}
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={objective.expression}
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
