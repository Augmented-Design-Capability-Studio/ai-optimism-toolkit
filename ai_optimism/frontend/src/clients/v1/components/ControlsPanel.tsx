'use client';

import { Box, Paper, Typography, Chip, Switch, FormControlLabel, IconButton, Tooltip } from '@mui/material';
import { useState, useMemo, useCallback, memo } from 'react';
import { VariableWidget } from './controls/controls/VariableWidget';
import { VariableEditDialog } from './controls/controls/VariableEditDialog';
import { ObjectiveCard } from './controls/controls/ObjectiveCard';
import { PropertyCard } from './controls/controls/PropertyCard';
import { ConstraintCard } from './controls/controls/ConstraintCard';
import { ConstraintEditDialog } from './controls/controls/ConstraintEditDialog';
import { ObjectiveEditDialog } from './controls/controls/ObjectiveEditDialog';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { AdvancedCodeView } from './controls/controls/AdvancedCodeView';
import CodeIcon from '@mui/icons-material/Code';
import TuneIcon from '@mui/icons-material/Tune';
import ClearIcon from '@mui/icons-material/Clear';
import { getControlsSummary } from '../services/controlsAggregator';
import { useControlsState } from './controls/controls/hooks/useControlsState';
import { useExpressionEvaluation } from './controls/controls/hooks/useExpressionEvaluation';
import { useVariableManagement } from './controls/controls/hooks/useVariableManagement';
import { useObjectiveManagement } from './controls/controls/hooks/useObjectiveManagement';
import { getSortedVariables, extractDependencies } from './controls/controls/utils/variableHelpers';
import { getUsedProperties, getPropertyUsageCount } from './controls/controls/utils/propertyHelpers';
import { evaluateExpression, parseConstraintForDisplay } from './controls/controls/utils/expressionHelpers';
import type { Controls } from './controls/controls/types';

interface ControlsPanelProps {
  controls?: unknown;
  initialValues?: Record<string, number>;
  onVariablesChange?: (variables: Record<string, number>) => void;
  onControlsUpdate?: (controls: unknown) => void;
  onClearControls?: () => void;
}

export const ControlsPanel = memo(function ControlsPanel({ controls, initialValues, onVariablesChange, onControlsUpdate, onClearControls }: ControlsPanelProps) {
  const [showAllVariables, setShowAllVariables] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [editingConstraint, setEditingConstraint] = useState<number | null>(null);
  const [constraintEditDialogOpen, setConstraintEditDialogOpen] = useState(false);

  // Use custom hooks for state management
  const {
    parsedControls,
    setParsedControls,
    values,
    setValues,
    handleValueChange,
  } = useControlsState({
    controls,
    initialValues,
    onVariablesChange,
  });

  const { evaluatedExpressions } = useExpressionEvaluation({
    parsedControls,
    values,
  });

  const {
    editingVariable,
    editDialogOpen,
    setEditDialogOpen,
    handleEditVariable,
    handleSaveVariable,
    handleDeleteVariable,
  } = useVariableManagement({
    parsedControls,
    setParsedControls,
    values,
    setValues,
    onControlsUpdate,
  });

  const {
    editingObjective,
    editDialogOpen: objectiveEditDialogOpen,
    setEditDialogOpen: setObjectiveEditDialogOpen,
    handleEditObjective,
    handleSaveObjective,
    handleDeleteObjective,
  } = useObjectiveManagement({
    parsedControls,
    setParsedControls,
    onControlsUpdate,
  });

  // Get sorted variables - memoize to prevent unnecessary recalculations and hook issues
  const { importantVars, otherVars } = useMemo(() => {
    const { important, other } = getSortedVariables(parsedControls);
    return {
      importantVars: important || [],
      otherVars: other || [],
    };
  }, [parsedControls]);

  // Helper functions using utilities - memoize to avoid re-creating on every render
  const evaluateExpr = useCallback((expression: string) =>
    evaluateExpression(expression, values, evaluatedExpressions),
    [values, evaluatedExpressions]
  );

  const getDependencies = (expression: string | undefined) =>
    extractDependencies(expression, parsedControls);

  // Memoize constraint evaluations to avoid re-rendering on every keystroke
  const constraintEvaluations = useMemo(() => {
    if (!parsedControls?.constraints) return [];
    
    return parsedControls.constraints
      .filter(constraint => constraint.expression) // Filter out constraints without expressions
      .map((constraint) => {
        const result = evaluateExpr(constraint.expression);
        const isSatisfied = result !== undefined && result > 0.5;
        const parsed = parseConstraintForDisplay(constraint.expression);
        
        // Evaluate LHS and RHS separately, handling property references
        let currentValue: number | undefined;
        let limit: number | undefined;
        
        if (parsed) {
          // Try to evaluate LHS (could be a property or variable)
          currentValue = evaluateExpr(parsed.lhs);
          
          // If LHS evaluation failed, try to evaluate as property
          if (currentValue === undefined && parsedControls.properties) {
            const property = parsedControls.properties.find(p => p.name === parsed.lhs.trim());
            if (property) {
              currentValue = evaluateExpr(property.expression);
            }
          }
          
          // Evaluate RHS (usually a number)
          limit = evaluateExpr(parsed.rhs);
          
          // If RHS is not a number, try to evaluate it
          if (limit === undefined && isNaN(Number(parsed.rhs))) {
            limit = evaluateExpr(parsed.rhs);
            // If still undefined, check if it's a property
            if (limit === undefined && parsedControls.properties) {
              const property = parsedControls.properties.find(p => p.name === parsed.rhs.trim());
              if (property) {
                limit = evaluateExpr(property.expression);
              }
            }
          } else if (limit === undefined) {
            limit = Number(parsed.rhs);
          }
        }
        
        const operator = parsed ? parsed.operator : undefined;
        
        return {
          constraint,
          isSatisfied,
          currentValue,
          limit,
          operator,
        };
      });
  }, [parsedControls?.constraints, parsedControls?.properties, evaluateExpr]);

  return (
    <Paper
      elevation={4}
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
          borderTop: '3px solid',
          borderTopColor: 'secondary.main',
          bgcolor: 'white',
          color: 'text.primary',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {advancedMode ? <CodeIcon /> : <TuneIcon />}
              {advancedMode ? 'Advanced Code' : 'Controls'}
            </Typography>
            {parsedControls && onClearControls && (
              <Tooltip title="Clear controls">
                <IconButton
                  size="small"
                  onClick={() => {
                    if (window.confirm('Clear all generated controls? This cannot be undone.')) {
                      onClearControls();
                    }
                  }}
                  sx={{ 
                    ml: 1,
                    color: 'text.secondary',
                    '&:hover': {
                      color: 'error.main',
                      bgcolor: 'error.light',
                    }
                  }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
            <Typography variant="caption">
              {advancedMode ? 'View generated Python configuration' : 'Adjust optimization parameters'}
            </Typography>
            {parsedControls && !advancedMode && (() => {
              const summary = getControlsSummary(parsedControls);
              return (
                <>
                  {summary.variableCount > 0 && (
                    <Chip
                      label={`${summary.variableCount} var${summary.variableCount !== 1 ? 's' : ''}`}
                      size="small"
                      sx={{ height: 20, fontSize: '0.65rem' }}
                    />
                  )}
                  {summary.objectiveCount > 0 && (
                    <Chip
                      label={`${summary.objectiveCount} obj${summary.objectiveCount !== 1 ? 's' : ''}`}
                      size="small"
                      sx={{ height: 20, fontSize: '0.65rem' }}
                    />
                  )}
                  {summary.constraintCount > 0 && (
                    <Chip
                      label={`${summary.constraintCount} constraint${summary.constraintCount !== 1 ? 's' : ''}`}
                      size="small"
                      sx={{ height: 20, fontSize: '0.65rem' }}
                    />
                  )}
                  {summary.isPartial && (
                    <Chip
                      label="partial"
                      size="small"
                      color="warning"
                      sx={{ height: 20, fontSize: '0.65rem' }}
                    />
                  )}
                </>
              );
            })()}
          </Box>
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
            {parsedControls.variables && parsedControls.variables.length > 0 ? (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ color: 'primary.main' }}>
                    🎚️ Variables ({parsedControls.variables.length})
                  </Typography>
                  {otherVars.length > 0 && (
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
                        {showAllVariables ? 'Show less' : `Show all (${otherVars.length} more)`}
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
                    mb: showAllVariables && otherVars.length > 0 ? 2 : 0,
                  }}
                >
                  {importantVars.map((variable) => (
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
                {showAllVariables && otherVars.length > 0 && (
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
                      {otherVars.map((variable) => (
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
            ) : null}

            {/* Objectives Section */}
            <Box sx={{ mb: 3 }}>
              {parsedControls.objectives && parsedControls.objectives.length > 0 ? (
                <>
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
                      currentValue={evaluateExpr(objective.expression)}
                      dependencies={getDependencies(objective.expression)}
                      onEdit={() => handleEditObjective(idx)}
                      onVariableClick={(varName) => {
                        // Scroll to variable card - implementation TBD
                        console.log('Navigate to variable:', varName);
                      }}
                    />
                  ))}
                </Box>
                </>
              ) : (
                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'grey.50',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    🎯 No objectives defined yet
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Continue chatting with the AI to define optimization objectives
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Properties Section */}
            {(() => {
              const usedProperties = getUsedProperties(parsedControls);
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
                        currentValue={evaluateExpr(property.expression)}
                        dependencies={getDependencies(property.expression)}
                        usedByCount={getPropertyUsageCount(property.name, parsedControls)}
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
            <Box sx={{ mb: 3 }}>
              {parsedControls.constraints && parsedControls.constraints.length > 0 ? (
                <>
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
                  {constraintEvaluations.map((evalResult, idx) => (
                    <ConstraintCard
                      key={idx}
                      constraint={evalResult.constraint}
                      currentValue={evalResult.currentValue}
                      limit={evalResult.limit}
                      operator={evalResult.operator}
                      isSatisfied={evalResult.isSatisfied}
                      dependencies={getDependencies(evalResult.constraint.expression)}
                      onEdit={() => {
                        setEditingConstraint(idx);
                        setConstraintEditDialogOpen(true);
                      }}
                      onVariableClick={(varName) => {
                        console.log('Navigate to variable:', varName);
                      }}
                    />
                  ))}
                </Box>
                </>
              ) : (
                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'grey.50',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    ⚠️ No constraints defined yet
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Continue chatting with the AI to add constraints
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {/* Edit Dialogs */}
      <VariableEditDialog
        open={editDialogOpen}
        variable={editingVariable}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleSaveVariable}
        onDelete={handleDeleteVariable}
      />
      <ConstraintEditDialog
        open={constraintEditDialogOpen}
        constraint={editingConstraint !== null && parsedControls?.constraints ? parsedControls.constraints[editingConstraint] : null}
        onClose={() => {
          setConstraintEditDialogOpen(false);
          setEditingConstraint(null);
        }}
        onSave={(updatedConstraint) => {
          if (editingConstraint !== null && parsedControls?.constraints) {
            const updatedConstraints = [...parsedControls.constraints];
            updatedConstraints[editingConstraint] = updatedConstraint;
            const updatedControls: Controls = {
              ...parsedControls,
              variables: parsedControls.variables || [],
              constraints: updatedConstraints,
            };
            setParsedControls(updatedControls);
            onControlsUpdate?.(updatedControls);
          }
          setConstraintEditDialogOpen(false);
          setEditingConstraint(null);
        }}
        onDelete={() => {
          if (editingConstraint !== null && parsedControls?.constraints) {
            const updatedConstraints = parsedControls.constraints.filter((_, idx) => idx !== editingConstraint);
            const updatedControls: Controls = {
              ...parsedControls,
              variables: parsedControls.variables || [],
              constraints: updatedConstraints.length > 0 ? updatedConstraints : undefined,
            };
            setParsedControls(updatedControls);
            onControlsUpdate?.(updatedControls);
          }
          setConstraintEditDialogOpen(false);
          setEditingConstraint(null);
        }}
      />
      <ObjectiveEditDialog
        open={objectiveEditDialogOpen}
        objective={editingObjective}
        onClose={() => setObjectiveEditDialogOpen(false)}
        onSave={handleSaveObjective}
        onDelete={parsedControls?.objectives && parsedControls.objectives.length > 1 ? handleDeleteObjective : undefined}
      />
    </Paper>
  );
}, (prevProps, nextProps) => {
  // Always re-render if controls reference changed
  if (prevProps.controls !== nextProps.controls) {
    return false; // Re-render
  }
  
  // Always re-render if initialValues reference changed (optimization results applied)
  if (prevProps.initialValues !== nextProps.initialValues) {
    return false; // Re-render
  }
  
  // Skip re-render only if both references are the same
  return true;
});
