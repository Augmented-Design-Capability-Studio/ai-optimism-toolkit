/**
 * Dialog for editing variable properties
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  IconButton,
  Chip,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState, useEffect } from 'react';
import type { Variable } from './types';

interface VariableEditDialogProps {
  open: boolean;
  variable: Variable | null;
  onClose: () => void;
  onSave: (variable: Variable) => void;
  onDelete?: () => void;
}

export function VariableEditDialog({
  open,
  variable,
  onClose,
  onSave,
  onDelete,
}: VariableEditDialogProps) {
  const [editedVariable, setEditedVariable] = useState<Variable | null>(null);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    if (variable) {
      setEditedVariable({ ...variable });
    }
  }, [variable]);

  if (!editedVariable) return null;

  const handleSave = () => {
    onSave(editedVariable);
    onClose();
  };

  const handleTypeChange = (newType: 'continuous' | 'discrete' | 'categorical') => {
    const updated: Variable = {
      ...editedVariable,
      type: newType,
    };

    // Set appropriate defaults for new type
    if (newType === 'categorical') {
      updated.categories = editedVariable.categories || ['Option 1', 'Option 2'];
      updated.currentCategory = editedVariable.currentCategory || 'Option 1';
      delete updated.min;
      delete updated.max;
      delete updated.default;
    } else {
      updated.min = editedVariable.min ?? 0;
      updated.max = editedVariable.max ?? 100;
      updated.default = editedVariable.default ?? 0;
      delete updated.categories;
      delete updated.currentCategory;
    }

    setEditedVariable(updated);
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && editedVariable.categories) {
      setEditedVariable({
        ...editedVariable,
        categories: [...editedVariable.categories, newCategory.trim()],
      });
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (index: number) => {
    if (editedVariable.categories && editedVariable.categories.length > 2) {
      setEditedVariable({
        ...editedVariable,
        categories: editedVariable.categories.filter((_, i) => i !== index),
      });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Edit Variable
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          {/* Name */}
          <TextField
            label="Name"
            fullWidth
            value={editedVariable.name}
            onChange={(e) => setEditedVariable({ ...editedVariable, name: e.target.value })}
            required
          />

          {/* Description */}
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={editedVariable.description}
            onChange={(e) => setEditedVariable({ ...editedVariable, description: e.target.value })}
          />

          {/* Unit */}
          <TextField
            label="Unit"
            fullWidth
            value={editedVariable.unit || ''}
            onChange={(e) => setEditedVariable({ ...editedVariable, unit: e.target.value })}
            placeholder="e.g., mm, kg, °C"
          />

          {/* Type */}
          <FormControl component="fieldset">
            <FormLabel component="legend">Variable Type</FormLabel>
            <RadioGroup
              row
              value={editedVariable.type}
              onChange={(e) => handleTypeChange(e.target.value as any)}
            >
              <FormControlLabel value="continuous" control={<Radio />} label="Continuous" />
              <FormControlLabel value="discrete" control={<Radio />} label="Discrete" />
              <FormControlLabel value="categorical" control={<Radio />} label="Categorical" />
            </RadioGroup>
          </FormControl>

          {/* Numerical ranges (continuous/discrete) */}
          {(editedVariable.type === 'continuous' || editedVariable.type === 'discrete') && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Minimum"
                type="number"
                value={editedVariable.min ?? 0}
                onChange={(e) =>
                  setEditedVariable({ ...editedVariable, min: parseFloat(e.target.value) })
                }
                fullWidth
              />
              <TextField
                label="Maximum"
                type="number"
                value={editedVariable.max ?? 100}
                onChange={(e) =>
                  setEditedVariable({ ...editedVariable, max: parseFloat(e.target.value) })
                }
                fullWidth
              />
              <TextField
                label="Default"
                type="number"
                value={editedVariable.default ?? 0}
                onChange={(e) =>
                  setEditedVariable({ ...editedVariable, default: parseFloat(e.target.value) })
                }
                fullWidth
              />
            </Box>
          )}

          {/* Categories (categorical) */}
          {editedVariable.type === 'categorical' && (
            <Box>
              <FormLabel component="legend" sx={{ mb: 1 }}>
                Categories
              </FormLabel>
              <Stack spacing={1}>
                {editedVariable.categories?.map((cat, idx) => (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={cat}
                      onDelete={
                        editedVariable.categories && editedVariable.categories.length > 2
                          ? () => handleRemoveCategory(idx)
                          : undefined
                      }
                      sx={{ flex: 1 }}
                    />
                  </Box>
                ))}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="New category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                    fullWidth
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleAddCategory}
                  >
                    Add
                  </Button>
                </Box>
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
        <Box>
          {onDelete && (
            <Button color="error" startIcon={<DeleteIcon />} onClick={onDelete}>
              Delete Variable
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
