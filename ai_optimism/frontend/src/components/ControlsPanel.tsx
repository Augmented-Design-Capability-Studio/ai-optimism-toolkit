'use client';

import { Box, Paper, Typography, Tabs, Tab, IconButton, Tooltip } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import { useState, useEffect, useCallback, useRef } from 'react';
import { VariablesTab, Variable } from './controls/VariablesTab';
import { ObjectivesTab, Objective } from './controls/ObjectivesTab';
import { PropertiesTab, Property } from './controls/PropertiesTab';
import { ConstraintsTab, Constraint } from './controls/ConstraintsTab';

interface GeneratedControls {
  variables?: Variable[];
  objectives?: Objective[];
  properties?: Property[];
  constraints?: Constraint[];
}

interface ControlsPanelProps {
  controls?: unknown;
  onVariablesChange?: (variables: Record<string, number>) => void;
  onControlsUpdate?: (controls: GeneratedControls) => void;
}

interface HistoryState {
  variables: Variable[];
  objectives: Objective[];
  properties: Property[];
  constraints: Constraint[];
  values: Record<string, number>;
}

export function ControlsPanel({ controls, onVariablesChange, onControlsUpdate }: ControlsPanelProps) {
  const [tabValue, setTabValue] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Extract variables from generated controls
  const generatedControls = controls as GeneratedControls | null;
  const [variables, setVariables] = useState<Variable[]>(generatedControls?.variables || []);
  const [objectives, setObjectives] = useState<Objective[]>(generatedControls?.objectives || []);
  const [properties, setProperties] = useState<Property[]>(generatedControls?.properties || []);
  const [constraints, setConstraints] = useState<Constraint[]>(generatedControls?.constraints || []);
  
  // Undo/Redo history
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);
  const [resetKey, setResetKey] = useState(0); // Key to force tab re-render on undo/redo
  
  // Update local state when controls prop changes
  useEffect(() => {
    setVariables(generatedControls?.variables || []);
    setObjectives(generatedControls?.objectives || []);
    setProperties(generatedControls?.properties || []);
    setConstraints(generatedControls?.constraints || []);
    
    // Save initial state to history
    if (history.length === 0) {
      const initialState: HistoryState = {
        variables: generatedControls?.variables || [],
        objectives: generatedControls?.objectives || [],
        properties: generatedControls?.properties || [],
        constraints: generatedControls?.constraints || [],
        values: {},
      };
      setHistory([initialState]);
      setHistoryIndex(0);
    }
  }, [controls]);
  
  const [values, setValues] = useState<Record<string, number>>({});

  // Save current state to history
  const saveToHistory = useCallback(() => {
    if (isUndoRedoAction.current) return;
    
    const newState: HistoryState = {
      variables: JSON.parse(JSON.stringify(variables)),
      objectives: JSON.parse(JSON.stringify(objectives)),
      properties: JSON.parse(JSON.stringify(properties)),
      constraints: JSON.parse(JSON.stringify(constraints)),
      values: JSON.parse(JSON.stringify(values)),
    };
    
    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    
    // Limit history to 50 items
    if (newHistory.length > 50) {
      newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    } else {
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
    
    setHasUnsavedChanges(false); // Clear unsaved changes flag
  }, [variables, objectives, properties, constraints, values, history, historyIndex]);
  
  // Undo function
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    
    isUndoRedoAction.current = true;
    const prevState = history[historyIndex - 1];
    setVariables(prevState.variables);
    setObjectives(prevState.objectives);
    setProperties(prevState.properties);
    setConstraints(prevState.constraints);
    setValues(prevState.values);
    setHistoryIndex(historyIndex - 1);
    setResetKey(prev => prev + 1); // Force tab re-render
    
    setTimeout(() => {
      isUndoRedoAction.current = false;
    }, 100);
  }, [history, historyIndex]);
  
  // Redo function
  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    
    isUndoRedoAction.current = true;
    const nextState = history[historyIndex + 1];
    setVariables(nextState.variables);
    setObjectives(nextState.objectives);
    setProperties(nextState.properties);
    setConstraints(nextState.constraints);
    setValues(nextState.values);
    setHistoryIndex(historyIndex + 1);
    setResetKey(prev => prev + 1); // Force tab re-render
    
    setTimeout(() => {
      isUndoRedoAction.current = false;
    }, 100);
  }, [history, historyIndex]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Update values when controls change
  useEffect(() => {
    const initial: Record<string, number> = {};
    variables.forEach((v) => {
      initial[v.name] = v.default ?? 0;
    });
    setValues(initial);
  }, [controls, variables]);

  // Handle slider changes for variables
  const handleSliderChange = (name: string, newValue: number) => {
    const updated = { ...values, [name]: newValue };
    setValues(updated);
    onVariablesChange?.(updated);
  };

  // Mark that there are unsaved changes
  const markUnsavedChanges = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  // Save and clear unsaved changes flag
  const saveAndClearUnsaved = useCallback(() => {
    if (hasUnsavedChanges) {
      saveToHistory();
      setHasUnsavedChanges(false);
    }
  }, [hasUnsavedChanges, saveToHistory]);

  // Handle tab change - save unsaved changes first
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    saveAndClearUnsaved();
    setTabValue(newValue);
  }, [saveAndClearUnsaved]);

  // Handle variable name changes - propagate to objectives, properties, constraints
  const handleVariableNameChange = (oldName: string, newName: string) => {
    // If newName is empty, it means we're deleting the variable
    if (!newName) {
      // Remove variable from values
      const updatedValues = { ...values };
      delete updatedValues[oldName];
      setValues(updatedValues);
      
      // Notify parent
      if (onControlsUpdate) {
        onControlsUpdate({
          variables,
          objectives,
          properties,
          constraints,
        });
      }
      return;
    }
    
    // Update expressions in objectives
    const updatedObjectives = objectives.map(obj => ({
      ...obj,
      expression: obj.expression.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName)
    }));
    
    // Update expressions in properties
    const updatedProperties = properties.map(prop => ({
      ...prop,
      expression: prop.expression.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName)
    }));
    
    // Update expressions in constraints
    const updatedConstraints = constraints.map(cons => ({
      ...cons,
      expression: cons.expression.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName)
    }));
    
    // Update values object
    const updatedValues = { ...values };
    if (updatedValues[oldName] !== undefined) {
      updatedValues[newName] = updatedValues[oldName];
      delete updatedValues[oldName];
    }
    
    setObjectives(updatedObjectives);
    setProperties(updatedProperties);
    setConstraints(updatedConstraints);
    setValues(updatedValues);
    
    // Notify parent
    if (onControlsUpdate) {
      onControlsUpdate({
        variables,
        objectives: updatedObjectives,
        properties: updatedProperties,
        constraints: updatedConstraints,
      });
    }
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight="bold">
            🎛️ Controls
          </Typography>
          <Typography variant="caption">
            Adjust optimization parameters
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Undo (Ctrl+Z)">
            <span>
              <IconButton
                size="small"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                sx={{ color: 'secondary.contrastText' }}
              >
                <UndoIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Shift+Z)">
            <span>
              <IconButton
                size="small"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                sx={{ color: 'secondary.contrastText' }}
              >
                <RedoIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs 
        value={tabValue} 
        onChange={handleTabChange} 
        sx={{ borderBottom: 1, borderColor: 'divider' }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Variables" />
        <Tab label="Properties" />
        <Tab label="Objectives" />
        <Tab label="Constraints" />
      </Tabs>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {/* Tab 0: Variables (Interactive) */}
        {tabValue === 0 && (
          <VariablesTab 
            key={`variables-${resetKey}`}
            variables={variables}
            values={values}
            onValueChange={handleSliderChange}
            onVariablesChange={setVariables}
            onVariableNameChange={handleVariableNameChange}
            onSaveHistory={saveToHistory}
            onUnsavedChanges={markUnsavedChanges}
            properties={properties}
            objectives={objectives}
            constraints={constraints}
            onNavigateToTab={(tab, index) => setTabValue(tab)}
          />
        )}

        {/* Tab 1: Properties */}
        {tabValue === 1 && (
          <PropertiesTab 
            key={`properties-${resetKey}`}
            properties={properties}
            variables={variables}
            onPropertiesChange={setProperties}
            onSaveHistory={saveToHistory}
            onUnsavedChanges={markUnsavedChanges}
            objectives={objectives}
            constraints={constraints}
            onNavigateToTab={(tab, index) => setTabValue(tab)}
          />
        )}

        {/* Tab 2: Objectives */}
        {tabValue === 2 && (
          <ObjectivesTab 
            key={`objectives-${resetKey}`}
            objectives={objectives}
            variables={variables}
            properties={properties}
            onObjectivesChange={setObjectives}
            onSaveHistory={saveToHistory}
            onUnsavedChanges={markUnsavedChanges}
          />
        )}

        {/* Tab 3: Constraints */}
        {tabValue === 3 && (
          <ConstraintsTab 
            key={`constraints-${resetKey}`}
            constraints={constraints}
            variables={variables}
            properties={properties}
            onConstraintsChange={setConstraints}
            onSaveHistory={saveToHistory}
            onUnsavedChanges={markUnsavedChanges}
          />
        )}
      </Box>
    </Paper>
  );
}
