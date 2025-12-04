/**
 * Form section for numerical variable ranges
 */

import { TextField, Box } from '@mui/material';
import type { Variable } from './types';

interface VariableNumericalRangesProps {
  variable: Variable;
  onVariableChange: (variable: Variable) => void;
}

export function VariableNumericalRanges({
  variable,
  onVariableChange,
}: VariableNumericalRangesProps) {
  if (variable.type === 'categorical') {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <TextField
        label="Minimum"
        type="number"
        value={variable.min ?? 0}
        onChange={(e) =>
          onVariableChange({ ...variable, min: parseFloat(e.target.value) })
        }
        fullWidth
      />
      <TextField
        label="Maximum"
        type="number"
        value={variable.max ?? 100}
        onChange={(e) =>
          onVariableChange({ ...variable, max: parseFloat(e.target.value) })
        }
        fullWidth
      />
      <TextField
        label="Default"
        type="number"
        value={variable.default ?? 0}
        onChange={(e) =>
          onVariableChange({ ...variable, default: parseFloat(e.target.value) })
        }
        fullWidth
      />
    </Box>
  );
}

