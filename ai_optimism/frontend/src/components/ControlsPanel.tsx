'use client';

import { Box, Paper, Typography, Tabs, Tab } from '@mui/material';
import { useState, useEffect } from 'react';
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

export function ControlsPanel({ controls, onVariablesChange, onControlsUpdate }: ControlsPanelProps) {
  const [tabValue, setTabValue] = useState(0);
  
  // Extract variables from generated controls
  const generatedControls = controls as GeneratedControls | null;
  const [variables, setVariables] = useState<Variable[]>(generatedControls?.variables || []);
  const [objectives, setObjectives] = useState<Objective[]>(generatedControls?.objectives || []);
  const [properties, setProperties] = useState<Property[]>(generatedControls?.properties || []);
  const [constraints, setConstraints] = useState<Constraint[]>(generatedControls?.constraints || []);
  
  // Update local state when controls prop changes
  useEffect(() => {
    setVariables(generatedControls?.variables || []);
    setObjectives(generatedControls?.objectives || []);
    setProperties(generatedControls?.properties || []);
    setConstraints(generatedControls?.constraints || []);
  }, [controls]);
  
  const [values, setValues] = useState<Record<string, number>>({});

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

  // Handle variable name changes - propagate to objectives, properties, constraints
  const handleVariableNameChange = (oldName: string, newName: string) => {
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
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          🎛️ Controls
        </Typography>
        <Typography variant="caption">
          Adjust optimization parameters
        </Typography>
      </Box>

      {/* Tabs */}
      <Tabs 
        value={tabValue} 
        onChange={(_, v) => setTabValue(v)} 
        sx={{ borderBottom: 1, borderColor: 'divider' }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Variables" />
        <Tab label="Objectives" />
        <Tab label="Properties" />
        <Tab label="Constraints" />
      </Tabs>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {/* Tab 0: Variables (Interactive) */}
        {tabValue === 0 && (
          <VariablesTab 
            variables={variables}
            values={values}
            onValueChange={handleSliderChange}
            onVariablesChange={setVariables}
            onVariableNameChange={handleVariableNameChange}
          />
        )}

        {/* Tab 1: Objectives */}
        {tabValue === 1 && (
          <ObjectivesTab 
            objectives={objectives}
            variables={variables}
            properties={properties}
            onObjectivesChange={setObjectives}
          />
        )}

        {/* Tab 2: Properties */}
        {tabValue === 2 && (
          <PropertiesTab 
            properties={properties}
            variables={variables}
            onPropertiesChange={setProperties}
          />
        )}

        {/* Tab 3: Constraints */}
        {tabValue === 3 && (
          <ConstraintsTab 
            constraints={constraints}
            variables={variables}
            properties={properties}
            onConstraintsChange={setConstraints}
          />
        )}
      </Box>
    </Paper>
  );
}
