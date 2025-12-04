/**
 * Form section for variable modifier strategy
 */

import {
  Box,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
} from '@mui/material';
import type { Variable } from './types';

interface VariableModifierStrategyProps {
  variable: Variable;
  onVariableChange: (variable: Variable) => void;
}

export function VariableModifierStrategy({
  variable,
  onVariableChange,
}: VariableModifierStrategyProps) {
  return (
    <Box sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'primary.main' }}>
        Optimization Modifier
      </Typography>

      <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
        <FormLabel component="legend" sx={{ fontSize: '0.85rem' }}>Strategy</FormLabel>
        <RadioGroup
          row
          value={variable.modifierStrategy?.type || (variable.type === 'categorical' ? 'random_reset' : 'gaussian')}
          onChange={(e) => {
            const newType = e.target.value as any;
            onVariableChange({
              ...variable,
              modifierStrategy: {
                type: newType,
                // Set reasonable defaults based on new type
                sigma: newType === 'gaussian' ? (variable.max! - variable.min!) * 0.1 : undefined,
                stepSize: newType === 'uniform' ? (variable.max! - variable.min!) * 0.1 : undefined,
                probability: 1.0,
              }
            });
          }}
        >
          {variable.type === 'categorical' ? (
            <>
              <FormControlLabel value="random_reset" control={<Radio size="small" />} label={<Typography variant="body2">Random Reset</Typography>} />
              <FormControlLabel value="neighbor_step" control={<Radio size="small" />} label={<Typography variant="body2">Neighbor Step</Typography>} />
            </>
          ) : (
            <>
              <FormControlLabel value="gaussian" control={<Radio size="small" />} label={<Typography variant="body2">Gaussian</Typography>} />
              <FormControlLabel value="uniform" control={<Radio size="small" />} label={<Typography variant="body2">Uniform Step</Typography>} />
            </>
          )}
        </RadioGroup>
      </FormControl>

      {/* Strategy Parameters */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        {(variable.modifierStrategy?.type === 'gaussian' || (!variable.modifierStrategy && variable.type !== 'categorical')) && (
          <TextField
            label="Sigma (Std Dev)"
            type="number"
            size="small"
            fullWidth
            value={variable.modifierStrategy?.sigma ?? ((variable.max! - variable.min!) * 0.1).toFixed(2)}
            onChange={(e) => onVariableChange({
              ...variable,
              modifierStrategy: {
                ...variable.modifierStrategy,
                type: 'gaussian',
                sigma: parseFloat(e.target.value)
              }
            })}
            helperText="Spread of random changes"
          />
        )}

        {variable.modifierStrategy?.type === 'uniform' && (
          <TextField
            label="Step Size"
            type="number"
            size="small"
            fullWidth
            value={variable.modifierStrategy?.stepSize ?? ((variable.max! - variable.min!) * 0.1).toFixed(2)}
            onChange={(e) => onVariableChange({
              ...variable,
              modifierStrategy: {
                ...variable.modifierStrategy,
                type: 'uniform',
                stepSize: parseFloat(e.target.value)
              }
            })}
            helperText="Max size of single step"
          />
        )}

        <TextField
          label="Probability"
          type="number"
          size="small"
          fullWidth
          inputProps={{ min: 0, max: 1, step: 0.1 }}
          value={variable.modifierStrategy?.probability ?? 1.0}
          onChange={(e) => onVariableChange({
            ...variable,
            modifierStrategy: {
              ...variable.modifierStrategy!,
              probability: parseFloat(e.target.value)
            }
          })}
          helperText="Chance to modify (0-1)"
        />
      </Box>
    </Box>
  );
}

