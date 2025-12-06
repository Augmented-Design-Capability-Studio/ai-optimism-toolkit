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
import { useState, useEffect } from 'react';
import type { Variable } from './types';

interface VariableModifierStrategyProps {
  variable: Variable;
  onVariableChange: (variable: Variable) => void;
}

export function VariableModifierStrategy({
  variable,
  onVariableChange,
}: VariableModifierStrategyProps) {
  const [sigmaInput, setSigmaInput] = useState<string>('');
  const [stepSizeInput, setStepSizeInput] = useState<string>('');
  const [probabilityInput, setProbabilityInput] = useState<string>('');

  useEffect(() => {
    const defaultSigma = variable.modifierStrategy?.sigma ?? ((variable.max! - variable.min!) * 0.1);
    const defaultStepSize = variable.modifierStrategy?.stepSize ?? ((variable.max! - variable.min!) * 0.1);
    const defaultProbability = variable.modifierStrategy?.probability ?? 1.0;
    
    setSigmaInput(defaultSigma.toFixed(2));
    setStepSizeInput(defaultStepSize.toFixed(2));
    setProbabilityInput(defaultProbability.toString());
  }, [variable.modifierStrategy, variable.min, variable.max]);
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
            value={sigmaInput}
            onChange={(e) => setSigmaInput(e.target.value)}
            onBlur={(e) => {
              const parsed = parseFloat(e.target.value);
              if (!isNaN(parsed) && parsed > 0) {
                onVariableChange({
                  ...variable,
                  modifierStrategy: {
                    ...variable.modifierStrategy,
                    type: 'gaussian',
                    sigma: parsed
                  }
                });
                setSigmaInput(parsed.toFixed(2));
              } else if (e.target.value === '') {
                const defaultValue = (variable.max! - variable.min!) * 0.1;
                onVariableChange({
                  ...variable,
                  modifierStrategy: {
                    ...variable.modifierStrategy,
                    type: 'gaussian',
                    sigma: defaultValue
                  }
                });
                setSigmaInput(defaultValue.toFixed(2));
              } else {
                const lastValid = variable.modifierStrategy?.sigma ?? ((variable.max! - variable.min!) * 0.1);
                setSigmaInput(lastValid.toFixed(2));
              }
            }}
            helperText="Spread of random changes"
          />
        )}

        {variable.modifierStrategy?.type === 'uniform' && (
          <TextField
            label="Step Size"
            type="number"
            size="small"
            fullWidth
            value={stepSizeInput}
            onChange={(e) => setStepSizeInput(e.target.value)}
            onBlur={(e) => {
              const parsed = parseFloat(e.target.value);
              if (!isNaN(parsed) && parsed > 0) {
                onVariableChange({
                  ...variable,
                  modifierStrategy: {
                    ...variable.modifierStrategy,
                    type: 'uniform',
                    stepSize: parsed
                  }
                });
                setStepSizeInput(parsed.toFixed(2));
              } else if (e.target.value === '') {
                const defaultValue = (variable.max! - variable.min!) * 0.1;
                onVariableChange({
                  ...variable,
                  modifierStrategy: {
                    ...variable.modifierStrategy,
                    type: 'uniform',
                    stepSize: defaultValue
                  }
                });
                setStepSizeInput(defaultValue.toFixed(2));
              } else {
                const lastValid = variable.modifierStrategy?.stepSize ?? ((variable.max! - variable.min!) * 0.1);
                setStepSizeInput(lastValid.toFixed(2));
              }
            }}
            helperText="Max size of single step"
          />
        )}

        <TextField
          label="Probability"
          type="number"
          size="small"
          fullWidth
          inputProps={{ min: 0, max: 1, step: 0.1 }}
          value={probabilityInput}
          onChange={(e) => setProbabilityInput(e.target.value)}
          onBlur={(e) => {
            const parsed = parseFloat(e.target.value);
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
              onVariableChange({
                ...variable,
                modifierStrategy: {
                  ...variable.modifierStrategy!,
                  probability: parsed
                }
              });
              setProbabilityInput(parsed.toString());
            } else if (e.target.value === '') {
              const defaultValue = 1.0;
              onVariableChange({
                ...variable,
                modifierStrategy: {
                  ...variable.modifierStrategy!,
                  probability: defaultValue
                }
              });
              setProbabilityInput(defaultValue.toString());
            } else {
              const lastValid = variable.modifierStrategy?.probability ?? 1.0;
              setProbabilityInput(lastValid.toString());
            }
          }}
          helperText="Chance to modify (0-1)"
        />
      </Box>
    </Box>
  );
}

