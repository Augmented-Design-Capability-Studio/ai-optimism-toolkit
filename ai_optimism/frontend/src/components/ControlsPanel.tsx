'use client';

import { Box, Paper, Typography } from '@mui/material';
import { useState, useEffect } from 'react';
import type { Controls, Variable } from './controls/types';
import { VariableWidget } from './controls/VariableWidget';
import { VariableEditDialog } from './controls/VariableEditDialog';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

interface ControlsPanelProps {
  controls?: unknown;
  onVariablesChange?: (variables: Record<string, number>) => void;
  onControlsUpdate?: (controls: unknown) => void;
}

export function ControlsPanel({ controls, onVariablesChange, onControlsUpdate }: ControlsPanelProps) {
  const [parsedControls, setParsedControls] = useState<Controls | null>(null);
  const [values, setValues] = useState<Record<string, number>>({});
  const [showAllVariables, setShowAllVariables] = useState(false);
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Detect important variables based on:
  // 1. Used in objectives/constraints expressions
  // 2. Have specific units (likely measured/important)
  // 3. Limited range suggesting precision requirements
  const getVariableImportance = (variable: Variable): number => {
    let score = 0;
    
    // Check if used in objectives
    const usedInObjectives = parsedControls?.objectives?.some(
      obj => obj.expression.includes(variable.name)
    );
    if (usedInObjectives) score += 3;
    
    // Check if used in constraints
    const usedInConstraints = parsedControls?.constraints?.some(
      con => con.expression.includes(variable.name)
    );
    if (usedInConstraints) score += 2;
    
    // Has specific unit (suggests importance)
    if (variable.unit && variable.unit.length > 0) score += 1;
    
    // Small range suggests precision (important)
    if (variable.type !== 'categorical') {
      const range = (variable.max ?? 100) - (variable.min ?? 0);
      if (range <= 10) score += 1;
    }
    
    return score;
  };

  const getSortedVariables = (): { important: Variable[], other: Variable[] } => {
    if (!parsedControls?.variables) return { important: [], other: [] };
    
    const scored = parsedControls.variables.map(v => ({
      variable: v,
      score: getVariableImportance(v)
    }));
    
    scored.sort((a, b) => b.score - a.score);
    
    // Show variables with score > 1 or at least top 6
    const importantCount = Math.max(
      6,
      scored.filter(s => s.score > 1).length
    );
    
    return {
      important: scored.slice(0, importantCount).map(s => s.variable),
      other: scored.slice(importantCount).map(s => s.variable)
    };
  };

  const { important, other } = getSortedVariables();

  // Parse controls when they change
  useEffect(() => {
    if (controls) {
      const c = controls as Controls;
      setParsedControls(c);
      
      // Initialize values from defaults
      const initialValues: Record<string, number> = {};
      c.variables?.forEach((v: Variable) => {
        if (v.type === 'categorical') {
          initialValues[v.name] = 0; // Index of first category
        } else {
          initialValues[v.name] = v.default ?? v.min ?? 0;
        }
      });
      setValues(initialValues);
    }
  }, [controls]);

  // Notify parent of value changes
  useEffect(() => {
    if (Object.keys(values).length > 0) {
      onVariablesChange?.(values);
    }
  }, [values, onVariablesChange]);

  const handleValueChange = (name: string, value: number) => {
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const handleEditVariable = (variable: Variable) => {
    setEditingVariable(variable);
    setEditDialogOpen(true);
  };

  const handleSaveVariable = (updatedVariable: Variable) => {
    if (!parsedControls) return;

    // Update the variable in the controls
    const updatedVariables = parsedControls.variables?.map(v =>
      v.name === editingVariable?.name ? updatedVariable : v
    );

    const updatedControls = {
      ...parsedControls,
      variables: updatedVariables,
    };

    setParsedControls(updatedControls);
    
    // Update value if type changed or range changed
    if (updatedVariable.type === 'categorical') {
      setValues(prev => ({ ...prev, [updatedVariable.name]: 0 }));
    } else {
      const currentValue = values[updatedVariable.name];
      const min = updatedVariable.min ?? 0;
      const max = updatedVariable.max ?? 100;
      // Clamp existing value to new range
      const clampedValue = Math.max(min, Math.min(max, currentValue ?? min));
      setValues(prev => ({ ...prev, [updatedVariable.name]: clampedValue }));
    }

    // Notify parent of controls update
    onControlsUpdate?.(updatedControls);
  };

  const handleDeleteVariable = () => {
    if (!parsedControls || !editingVariable) return;

    const updatedVariables = parsedControls.variables?.filter(
      v => v.name !== editingVariable.name
    );

    const updatedControls = {
      ...parsedControls,
      variables: updatedVariables,
    };

    setParsedControls(updatedControls);
    
    // Remove value
    const newValues = { ...values };
    delete newValues[editingVariable.name];
    setValues(newValues);

    // Notify parent
    onControlsUpdate?.(updatedControls);
    
    setEditDialogOpen(false);
  };

  return (
    <Paper
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'secondary.main',
          color: 'secondary.contrastText',
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          🎛️ Controls
        </Typography>
        <Typography variant="caption">
          Adjust optimization parameters
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {!parsedControls ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">
              Generate controls from your conversation to get started
            </Typography>
          </Box>
        ) : (
          <Box>
            {/* Variables Section */}
            {parsedControls.variables && parsedControls.variables.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ color: 'primary.main' }}>
                    🎚️ Variables ({parsedControls.variables.length})
                  </Typography>
                  {other.length > 0 && (
                    <Box
                      onClick={() => setShowAllVariables(!showAllVariables)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        cursor: 'pointer',
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        '&:hover': { color: 'primary.main' },
                      }}
                    >
                      <Typography variant="caption">
                        {showAllVariables ? 'Show less' : `Show all (${other.length} more)`}
                      </Typography>
                      {showAllVariables ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </Box>
                  )}
                </Box>
                
                {/* Important variables */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
                    gridAutoRows: '70px',
                    gridAutoFlow: 'dense',
                    gap: 1.5,
                    mb: showAllVariables && other.length > 0 ? 2 : 0,
                  }}
                >
                  {important.map((variable) => (
                    <VariableWidget
                      key={variable.name}
                      variable={variable}
                      value={values[variable.name] ?? variable.default ?? 0}
                      onChange={(newValue) => handleValueChange(variable.name, newValue)}
                      onEdit={() => handleEditVariable(variable)}
                    />
                  ))}
                </Box>
                
                {/* Other variables (collapsible) */}
                {showAllVariables && other.length > 0 && (
                  <>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, mt: 1 }}>
                      Additional Parameters
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
                        gridAutoRows: '70px',
                        gridAutoFlow: 'dense',
                        gap: 1.5,
                      }}
                    >
                      {other.map((variable) => (
                        <VariableWidget
                          key={variable.name}
                          variable={variable}
                          value={values[variable.name] ?? variable.default ?? 0}
                          onChange={(newValue) => handleValueChange(variable.name, newValue)}
                          onEdit={() => handleEditVariable(variable)}
                        />
                      ))}
                    </Box>
                  </>
                )}
              </Box>
            )}

            {/* Objectives Section */}
            {parsedControls.objectives && parsedControls.objectives.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, color: 'success.main' }}>
                  🎯 Objectives ({parsedControls.objectives.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {parsedControls.objectives.map((objective, idx) => (
                    <Box key={idx} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight="bold">
                        {objective.name} ({objective.goal})
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {objective.description}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                        {objective.expression}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Properties Section */}
            {parsedControls.properties && parsedControls.properties.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, color: 'info.main' }}>
                  📊 Properties ({parsedControls.properties.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {parsedControls.properties.map((property, idx) => (
                    <Box key={idx} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight="bold">
                        {property.name}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {property.description}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                        {property.expression}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Constraints Section */}
            {parsedControls.constraints && parsedControls.constraints.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, color: 'warning.main' }}>
                  ⚠️ Constraints ({parsedControls.constraints.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {parsedControls.constraints.map((constraint, idx) => (
                    <Box key={idx} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {constraint.description}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                        {constraint.expression}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Edit Dialog */}
      <VariableEditDialog
        open={editDialogOpen}
        variable={editingVariable}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleSaveVariable}
        onDelete={handleDeleteVariable}
      />
    </Paper>
  );
}
