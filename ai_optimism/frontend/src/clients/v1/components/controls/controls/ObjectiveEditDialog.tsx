/**
 * Dialog for editing objective properties
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useState, useEffect } from 'react';
import type { Objective } from './types';

interface ObjectiveEditDialogProps {
  open: boolean;
  objective: Objective | null;
  onClose: () => void;
  onSave: (objective: Objective) => void;
  onDelete?: () => void;
}

export function ObjectiveEditDialog({
  open,
  objective,
  onClose,
  onSave,
  onDelete,
}: ObjectiveEditDialogProps) {
  const [editedObjective, setEditedObjective] = useState<Objective | null>(null);
  const [weightInput, setWeightInput] = useState<string>('');

  useEffect(() => {
    if (objective) {
      setEditedObjective({ ...objective, weight: objective.weight ?? 1.0 });
      setWeightInput((objective.weight ?? 1.0).toString());
    }
  }, [objective]);

  if (!editedObjective) return null;

  const handleSave = () => {
    onSave(editedObjective);
    onClose();
  };

  const handleGoalChange = (newGoal: 'minimize' | 'maximize') => {
    setEditedObjective({
      ...editedObjective,
      goal: newGoal,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Edit Objective
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          {/* Name */}
          <TextField
            label="Name"
            value={editedObjective.name}
            onChange={(e) =>
              setEditedObjective({ ...editedObjective, name: e.target.value })
            }
            placeholder="e.g., minimize_cost"
            helperText="Objective name (snake_case or camelCase)"
            fullWidth
            required
          />

          {/* Description */}
          <TextField
            label="Description"
            value={editedObjective.description}
            onChange={(e) =>
              setEditedObjective({ ...editedObjective, description: e.target.value })
            }
            multiline
            rows={2}
            helperText="What this objective optimizes"
            fullWidth
            required
          />

          {/* Expression */}
          <TextField
            label="Expression"
            value={editedObjective.expression}
            onChange={(e) =>
              setEditedObjective({ ...editedObjective, expression: e.target.value })
            }
            placeholder="e.g., total_price"
            helperText="Python expression that evaluates to a numeric value"
            fullWidth
            required
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
              },
            }}
          />

          {/* Goal */}
          <FormControl fullWidth>
            <InputLabel>Goal</InputLabel>
            <Select
              value={editedObjective.goal}
              onChange={(e) => handleGoalChange(e.target.value as 'minimize' | 'maximize')}
              label="Goal"
            >
              <MenuItem value="minimize">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingDownIcon sx={{ fontSize: 18, color: 'info.main' }} />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      Minimize
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Lower values are better
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
              <MenuItem value="maximize">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon sx={{ fontSize: 18, color: 'success.main' }} />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      Maximize
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Higher values are better
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {/* Weight */}
          <TextField
            label="Weight"
            type="number"
            value={weightInput}
            onChange={(e) => {
              setWeightInput(e.target.value);
            }}
            onBlur={(e) => {
              const parsed = parseFloat(e.target.value);
              if (!isNaN(parsed) && parsed > 0) {
                setEditedObjective({
                  ...editedObjective,
                  weight: parsed,
                });
                setWeightInput(parsed.toString());
              } else if (e.target.value === '') {
                // Empty input, set to default
                const defaultWeight = 1.0;
                setEditedObjective({
                  ...editedObjective,
                  weight: defaultWeight,
                });
                setWeightInput(defaultWeight.toString());
              } else {
                // Invalid input, reset to last valid value
                const lastValid = editedObjective?.weight ?? 1.0;
                setWeightInput(lastValid.toString());
              }
            }}
            helperText="Relative importance when combining multiple objectives. Higher weight = more important. Default: 1.0. Must be greater than 0."
            InputProps={{ inputProps: { min: 0.0001, step: 0.001 } }}
            fullWidth
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
        <Box>
          {onDelete && (
            <Button color="error" startIcon={<DeleteIcon />} onClick={onDelete}>
              Delete Objective
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Save Changes
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

