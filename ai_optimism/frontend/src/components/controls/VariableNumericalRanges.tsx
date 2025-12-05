/**
 * Form section for numerical variable ranges
 */

import { TextField, Box } from '@mui/material';
import { useState, useEffect } from 'react';
import type { Variable } from './types';

interface VariableNumericalRangesProps {
  variable: Variable;
  onVariableChange: (variable: Variable) => void;
}

export function VariableNumericalRanges({
  variable,
  onVariableChange,
}: VariableNumericalRangesProps) {
  const [minInput, setMinInput] = useState<string>('');
  const [maxInput, setMaxInput] = useState<string>('');
  const [defaultInput, setDefaultInput] = useState<string>('');

  useEffect(() => {
    setMinInput((variable.min ?? 0).toString());
    setMaxInput((variable.max ?? 100).toString());
    setDefaultInput((variable.default ?? 0).toString());
  }, [variable.min, variable.max, variable.default]);

  if (variable.type === 'categorical') {
    return null;
  }

  const handleMinBlur = (value: string) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      onVariableChange({ ...variable, min: parsed });
      setMinInput(parsed.toString());
    } else if (value === '') {
      const defaultValue = 0;
      onVariableChange({ ...variable, min: defaultValue });
      setMinInput(defaultValue.toString());
    } else {
      setMinInput((variable.min ?? 0).toString());
    }
  };

  const handleMaxBlur = (value: string) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      onVariableChange({ ...variable, max: parsed });
      setMaxInput(parsed.toString());
    } else if (value === '') {
      const defaultValue = 100;
      onVariableChange({ ...variable, max: defaultValue });
      setMaxInput(defaultValue.toString());
    } else {
      setMaxInput((variable.max ?? 100).toString());
    }
  };

  const handleDefaultBlur = (value: string) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      onVariableChange({ ...variable, default: parsed });
      setDefaultInput(parsed.toString());
    } else if (value === '') {
      const defaultValue = 0;
      onVariableChange({ ...variable, default: defaultValue });
      setDefaultInput(defaultValue.toString());
    } else {
      setDefaultInput((variable.default ?? 0).toString());
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <TextField
        label="Minimum"
        type="number"
        value={minInput}
        onChange={(e) => setMinInput(e.target.value)}
        onBlur={(e) => handleMinBlur(e.target.value)}
        fullWidth
      />
      <TextField
        label="Maximum"
        type="number"
        value={maxInput}
        onChange={(e) => setMaxInput(e.target.value)}
        onBlur={(e) => handleMaxBlur(e.target.value)}
        fullWidth
      />
      <TextField
        label="Default"
        type="number"
        value={defaultInput}
        onChange={(e) => setDefaultInput(e.target.value)}
        onBlur={(e) => handleDefaultBlur(e.target.value)}
        fullWidth
      />
    </Box>
  );
}

