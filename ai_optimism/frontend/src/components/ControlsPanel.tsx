'use client';

import { Box, Paper, Typography } from '@mui/material';
import { useState, useEffect } from 'react';
import type { Controls, Variable } from './controls/types';
import { VariableWidget } from './controls/VariableWidget';
import { VariableEditDialog } from './controls/VariableEditDialog';
import { ObjectiveCard } from './controls/ObjectiveCard';
import { PropertyCard } from './controls/PropertyCard';
import { ConstraintCard } from './controls/ConstraintCard';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { BACKEND_API } from '../config/backend';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { AdvancedCodeView } from './controls/AdvancedCodeView';
import CodeIcon from '@mui/icons-material/Code';
import TuneIcon from '@mui/icons-material/Tune';
import { Switch, FormControlLabel } from '@mui/material';

interface ControlsPanelProps {
  controls?: unknown;
  initialValues?: Record<string, number>;
  onVariablesChange?: (variables: Record<string, number>) => void;
  onControlsUpdate?: (controls: unknown) => void;
}

export function ControlsPanel({ controls, initialValues, onVariablesChange, onControlsUpdate }: ControlsPanelProps) {
  const [parsedControls, setParsedControls] = useState<Controls | null>(null);
  const [values, setValues] = useState<Record<string, number>>({});
  const [showAllVariables, setShowAllVariables] = useState(false);
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [evaluatedExpressions, setEvaluatedExpressions] = useState<Record<string, number>>({});
  const [advancedMode, setAdvancedMode] = useState(false);

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

  // Apply optimization results when initialValues change
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      console.log('[ControlsPanel] Applying optimization results:', initialValues);
      setValues(prev => ({ ...prev, ...initialValues }));
    }
  }, [initialValues]);

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

  // Extract variable dependencies from expression
  const extractDependencies = (expression: string): string[] => {
    const variablePattern = /[a-zA-Z_][a-zA-Z0-9_]*/g;
    const matches = expression.match(variablePattern) || [];
    const uniqueVars = [...new Set(matches)];
    // Filter to only actual variables (not operators like 'max', 'min', etc.)
    return uniqueVars.filter(name =>
      parsedControls?.variables?.some(v => v.name === name)
    );
  };

  // Calculate how many times a property is used
  const getPropertyUsageCount = (propertyName: string): number => {
    let count = 0;
    parsedControls?.objectives?.forEach(obj => {
      if (obj.expression.includes(propertyName)) count++;
    });
    parsedControls?.constraints?.forEach(con => {
      if (con.expression.includes(propertyName)) count++;
    });
    return count;
  };

  // Filter to get only properties that are actually used
  const getUsedProperties = () => {
    if (!parsedControls?.properties) return [];
    return parsedControls.properties.filter(prop => getPropertyUsageCount(prop.name) > 0);
  };

  // Simple expression evaluator with backend preference and client-side fallback
  const evaluateExpression = (expression: string): number | undefined => {
    // Check if we have a cached evaluation from backend
    if (evaluatedExpressions[expression] !== undefined) {
      return evaluatedExpressions[expression];
    }

    // Fallback to client-side eval for simple numeric expressions only
    // This is safe for basic arithmetic with known variables
    try {
      // Replace variable names with their values
      let expr = expression;
      Object.entries(values).forEach(([name, value]) => {
        expr = expr.replace(new RegExp(`\\b${name}\\b`, 'g'), String(value));
      });

      // Only eval if expression looks safe (numbers and basic operators)
      // This prevents executing complex Python-specific syntax client-side
      if (/^[\d\s+\-*/().]+$/.test(expr)) {
        // eslint-disable-next-line no-eval
        return eval(expr);
      }

      // For complex expressions, return undefined if backend hasn't evaluated yet
      console.warn('[ControlsPanel] Complex expression needs backend evaluation:', expression);
      return undefined;
    } catch (error) {
      console.error('[ControlsPanel] Evaluation error:', expression, error);
      return undefined;
    }
  };

  // Evaluate all expressions server-side when values change
  useEffect(() => {
    if (!parsedControls || Object.keys(values).length === 0) return;

    const evaluateServerSide = async () => {
      try {
        // Collect all unique expressions
        const expressions = new Set<string>();

        parsedControls.objectives?.forEach(obj => expressions.add(obj.expression));
        parsedControls.properties?.forEach(prop => expressions.add(prop.expression));
        parsedControls.constraints?.forEach(con => expressions.add(con.expression));

        // Prepare variables for backend: map categorical indices to string values
        const variablesForEval: Record<string, string | number> = { ...values };

        parsedControls.variables?.forEach(variable => {
          if (variable.type === 'categorical' && variable.categories) {
            const index = values[variable.name];
            if (typeof index === 'number' && variable.categories[index]) {
              variablesForEval[variable.name] = variable.categories[index];
            }
          }
        });

        const response = await fetch(BACKEND_API.evaluate, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expressions: Array.from(expressions),
            variables: variablesForEval,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const newCache: Record<string, number> = {};

          data.results.forEach((result: any) => {
            if (result.value !== null && !result.error) {
              newCache[result.expression] = result.value;
            } else if (result.error) {
              console.warn('[ControlsPanel] Backend evaluation error:', result.expression, result.error);
            }
          });

          setEvaluatedExpressions(newCache);
        } else {
          console.error('[ControlsPanel] Backend evaluation request failed:', response.status);
        }
      } catch (error) {
        console.warn('[ControlsPanel] Backend unavailable, using client-side fallback:', error);
        // Clear cache so fallback is used
        setEvaluatedExpressions({});
      }
    };

    evaluateServerSide();
  }, [values, parsedControls]);

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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {advancedMode ? <CodeIcon /> : <TuneIcon />}
            {advancedMode ? 'Advanced Code' : 'Controls'}
          </Typography>
          <Typography variant="caption">
            {advancedMode ? 'View generated Python configuration' : 'Adjust optimization parameters'}
          </Typography>
        </Box>
        <FormControlLabel
          control={
            <Switch
              size="small"
              color="default"
              checked={advancedMode}
              onChange={(e) => setAdvancedMode(e.target.checked)}
            />
          }
          label={<Typography variant="caption" sx={{ color: 'inherit' }}>Advanced</Typography>}
        />
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
        ) : advancedMode ? (
          <AdvancedCodeView controls={parsedControls} />
        ) : (
          <Box>
            {/* ... existing controls content ... */}
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
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, color: 'success.main' }}>
                  🎯 Objectives ({parsedControls.objectives.length})
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
                  {parsedControls.objectives.map((objective, idx) => (
                    <ObjectiveCard
                      key={idx}
                      objective={objective}
                      currentValue={evaluateExpression(objective.expression)}
                      dependencies={extractDependencies(objective.expression)}
                      onVariableClick={(varName) => {
                        // Scroll to variable card - implementation TBD
                        console.log('Navigate to variable:', varName);
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Properties Section */}
            {(() => {
              const usedProperties = getUsedProperties();
              return usedProperties.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, color: 'info.main' }}>
                    📊 Properties ({usedProperties.length})
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
                    {usedProperties.map((property, idx) => (
                      <PropertyCard
                        key={idx}
                        property={property}
                        currentValue={evaluateExpression(property.expression)}
                        dependencies={extractDependencies(property.expression)}
                        usedByCount={getPropertyUsageCount(property.name)}
                        onVariableClick={(varName) => {
                          console.log('Navigate to variable:', varName);
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              );
            })()}

            {/* Constraints Section */}
            {parsedControls.constraints && parsedControls.constraints.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, color: 'warning.main' }}>
                  ⚠️ Constraints ({parsedControls.constraints.length})
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
                  {parsedControls.constraints.map((constraint, idx) => {
                    // Simply evaluate the full constraint expression
                    // Backend handles all operators: <=, >=, <, >, ==, !=, and complex logic
                    const result = evaluateExpression(constraint.expression);

                    // Constraint is satisfied if result is truthy (>0 or true)
                    const isSatisfied = result !== undefined && result > 0.5; // Use 0.5 threshold for boolean-like values

                    // Try to parse for display purposes (LHS vs RHS)
                    const parseForDisplay = (expr: string): { lhs: string; rhs: string } | null => {
                      const operators = ['<=', '>=', '==', '!=', '<', '>'];
                      for (const op of operators) {
                        const idx = expr.indexOf(op);
                        if (idx > 0) {
                          return {
                            lhs: expr.substring(0, idx).trim(),
                            rhs: expr.substring(idx + op.length).trim(),
                          };
                        }
                      }
                      return null;
                    };

                    const parsed = parseForDisplay(constraint.expression);
                    const currentValue = parsed ? evaluateExpression(parsed.lhs) : undefined;
                    const limit = parsed ? evaluateExpression(parsed.rhs) : undefined;

                    return (
                      <ConstraintCard
                        key={idx}
                        constraint={constraint}
                        currentValue={currentValue}
                        limit={limit}
                        isSatisfied={isSatisfied}
                        dependencies={extractDependencies(constraint.expression)}
                        onVariableClick={(varName) => {
                          console.log('Navigate to variable:', varName);
                        }}
                      />
                    );
                  })}
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
