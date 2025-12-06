/**
 * Form section for basic variable information
 */

import { TextField, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Stack } from '@mui/material';
import type { Variable } from './types';

interface VariableBasicInfoFormProps {
  variable: Variable;
  onVariableChange: (variable: Variable) => void;
  onTypeChange: (newType: 'continuous' | 'discrete' | 'categorical') => void;
}

export function VariableBasicInfoForm({
  variable,
  onVariableChange,
  onTypeChange,
}: VariableBasicInfoFormProps) {
  return (
    <Stack spacing={2.5}>
      {/* Name */}
      <TextField
        label="Name"
        fullWidth
        value={variable.name}
        onChange={(e) => onVariableChange({ ...variable, name: e.target.value })}
        required
      />

      {/* Description */}
      <TextField
        label="Description"
        fullWidth
        multiline
        rows={2}
        value={variable.description}
        onChange={(e) => onVariableChange({ ...variable, description: e.target.value })}
      />

      {/* Unit */}
      <TextField
        label="Unit"
        fullWidth
        value={variable.unit || ''}
        onChange={(e) => onVariableChange({ ...variable, unit: e.target.value })}
        placeholder="e.g., mm, kg, °C"
      />

      {/* Type */}
      <FormControl component="fieldset">
        <FormLabel component="legend">Variable Type</FormLabel>
        <RadioGroup
          row
          value={variable.type}
          onChange={(e) => onTypeChange(e.target.value as any)}
        >
          <FormControlLabel value="continuous" control={<Radio />} label="Continuous" />
          <FormControlLabel value="discrete" control={<Radio />} label="Discrete" />
          <FormControlLabel value="categorical" control={<Radio />} label="Categorical" />
        </RadioGroup>
      </FormControl>
    </Stack>
  );
}



