/**
 * Dialog for editing constraint properties
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
import LockIcon from '@mui/icons-material/Lock';
import TuneIcon from '@mui/icons-material/Tune';
import { useState, useEffect } from 'react';
import type { Constraint } from './types';

interface ConstraintEditDialogProps {
  open: boolean;
  constraint: Constraint | null;
  onClose: () => void;
  onSave: (constraint: Constraint) => void;
  onDelete?: () => void;
}

export function ConstraintEditDialog({
  open,
  constraint,
  onClose,
  onSave,
  onDelete,
}: ConstraintEditDialogProps) {
  const [editedConstraint, setEditedConstraint] = useState<Constraint | null>(null);

  useEffect(() => {
    if (constraint) {
      setEditedConstraint({ ...constraint });
    }
  }, [constraint]);

  if (!editedConstraint) return null;

  const handleSave = () => {
    onSave(editedConstraint);
    onClose();
  };

  const handleTypeChange = (newType: 'hard' | 'soft') => {
    const updated: Constraint = {
      ...editedConstraint,
      type: newType,
    };

    // Set default weight for soft constraints
    if (newType === 'soft' && updated.weight === undefined) {
      updated.weight = 10.0;
    }

    setEditedConstraint(updated);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Edit Constraint
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          {/* Title */}
          <TextField
            label="Title"
            value={editedConstraint.title || ''}
            onChange={(e) =>
              setEditedConstraint({ ...editedConstraint, title: e.target.value })
            }
            placeholder="e.g., Max Total Price"
            helperText="Short title for display (3-5 words)"
            fullWidth
          />

          {/* Description */}
          <TextField
            label="Description"
            value={editedConstraint.description}
            onChange={(e) =>
              setEditedConstraint({ ...editedConstraint, description: e.target.value })
            }
            multiline
            rows={2}
            helperText="What this constraint ensures"
            fullWidth
            required
          />

          {/* Expression */}
          <TextField
            label="Expression"
            value={editedConstraint.expression}
            onChange={(e) =>
              setEditedConstraint({ ...editedConstraint, expression: e.target.value })
            }
            placeholder="e.g., total_price <= 500"
            helperText="Python expression that returns True if satisfied, False if violated"
            fullWidth
            required
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
              },
            }}
          />

          {/* Constraint Type */}
          <FormControl fullWidth>
            <InputLabel>Constraint Type</InputLabel>
            <Select
              value={editedConstraint.type || 'hard'}
              onChange={(e) => handleTypeChange(e.target.value as 'hard' | 'soft')}
              label="Constraint Type"
            >
              <MenuItem value="hard">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LockIcon sx={{ fontSize: 18, color: 'error.main' }} />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      Hard Constraint
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Must be satisfied - violations invalidate solution
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
              <MenuItem value="soft">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TuneIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      Soft Constraint
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Preferred but can be violated - added as penalty to objective
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {/* Weight (for soft constraints) */}
          {editedConstraint.type === 'soft' && (
            <TextField
              label="Penalty Weight"
              type="number"
              value={editedConstraint.weight || 10.0}
              onChange={(e) =>
                setEditedConstraint({
                  ...editedConstraint,
                  weight: parseFloat(e.target.value) || 10.0,
                })
              }
              helperText="Higher weight = stronger preference to satisfy this constraint"
              InputProps={{ inputProps: { min: 0, step: 0.1 } }}
              fullWidth
            />
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
        <Box>
          {onDelete && (
            <Button color="error" startIcon={<DeleteIcon />} onClick={onDelete}>
              Delete Constraint
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

