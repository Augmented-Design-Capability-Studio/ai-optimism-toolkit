'use client';

import { Box, Paper, Typography, Tabs, Tab, Slider, TextField, Button, Divider } from '@mui/material';
import { useState } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';

interface Variable {
  name: string;
  type: 'continuous' | 'discrete';
  min: number;
  max: number;
  default: number;
  unit?: string;
  description: string;
}

interface ControlsPanelProps {
  variables?: Variable[];
  onVariablesChange?: (variables: Record<string, number>) => void;
}

export function ControlsPanel({ variables = [], onVariablesChange }: ControlsPanelProps) {
  const [tabValue, setTabValue] = useState(0);
  const [values, setValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    variables.forEach((v) => {
      initial[v.name] = v.default;
    });
    return initial;
  });

  // Generate Python script from variables
  const generateScript = () => {
    const lines = ['# Optimization Variables', ''];
    variables.forEach((v) => {
      lines.push(`${v.name} = ${values[v.name]}  # ${v.description}${v.unit ? ` (${v.unit})` : ''}`);
      lines.push(`# Range: [${v.min}, ${v.max}]`);
      lines.push('');
    });
    return lines.join('\n');
  };

  const [script, setScript] = useState(generateScript());

  const handleSliderChange = (name: string) => (_event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    const updated = { ...values, [name]: value };
    setValues(updated);
    setScript(generateScript());
    onVariablesChange?.(updated);
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
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Interactive" />
        <Tab label="Script" />
      </Tabs>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {tabValue === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {variables.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                No variables defined yet. Use the chat to describe your optimization problem.
              </Typography>
            ) : (
              variables.map((variable) => (
                <Box key={variable.name}>
                  <Typography variant="subtitle2" gutterBottom>
                    {variable.name}
                    {variable.unit && (
                      <Typography component="span" variant="caption" color="text.secondary">
                        {' '}
                        ({variable.unit})
                      </Typography>
                    )}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    {variable.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Slider
                      value={values[variable.name]}
                      onChange={handleSliderChange(variable.name)}
                      min={variable.min}
                      max={variable.max}
                      step={variable.type === 'discrete' ? 1 : (variable.max - variable.min) / 100}
                      marks={[
                        { value: variable.min, label: variable.min.toString() },
                        { value: variable.max, label: variable.max.toString() },
                      ]}
                      valueLabelDisplay="auto"
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      type="number"
                      value={values[variable.name]}
                      onChange={(e) => handleSliderChange(variable.name)(e as any, parseFloat(e.target.value))}
                      size="small"
                      sx={{ width: 100 }}
                      inputProps={{
                        min: variable.min,
                        max: variable.max,
                        step: variable.type === 'discrete' ? 1 : 0.01,
                      }}
                    />
                  </Box>
                  <Divider sx={{ mt: 2 }} />
                </Box>
              ))
            )}
          </Box>
        )}

        {tabValue === 1 && (
          <Box>
            <Box
              sx={{
                bgcolor: '#1e1e1e',
                borderRadius: 1,
                overflow: 'hidden',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Editor
                value={script}
                onValueChange={setScript}
                highlight={(code) => Prism.highlight(code, Prism.languages.python, 'python')}
                padding={16}
                style={{
                  fontFamily: '"Fira code", "Fira Mono", monospace',
                  fontSize: 13,
                  minHeight: 200,
                  backgroundColor: '#1e1e1e',
                  color: '#d4d4d4',
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Edit the script directly or use the interactive controls above
            </Typography>
          </Box>
        )}
      </Box>

      {/* Actions */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button variant="contained" fullWidth disabled={variables.length === 0}>
          Apply Changes
        </Button>
      </Box>
    </Paper>
  );
}
