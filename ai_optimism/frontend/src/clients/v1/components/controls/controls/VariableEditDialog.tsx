/**
 * Dialog for editing variable properties
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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState, useEffect } from 'react';
import type { Variable } from './types';
import { VariableBasicInfoForm } from './VariableBasicInfoForm';
import { VariableNumericalRanges } from './VariableNumericalRanges';
import { VariableCategoriesEditor } from './VariableCategoriesEditor';
import { VariableModifierStrategy } from './VariableModifierStrategy';

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
      updated.attributes = editedVariable.attributes || {};
      delete updated.min;
      delete updated.max;
      delete updated.default;
    } else {
      updated.min = editedVariable.min ?? 0;
      updated.max = editedVariable.max ?? 100;
      updated.default = editedVariable.default ?? 0;
      delete updated.categories;
      delete updated.currentCategory;
      delete updated.attributes;
    }

    setEditedVariable(updated);
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
          <VariableBasicInfoForm
            variable={editedVariable}
            onVariableChange={setEditedVariable}
            onTypeChange={handleTypeChange}
          />

          <VariableNumericalRanges
            variable={editedVariable}
            onVariableChange={setEditedVariable}
          />

          <VariableCategoriesEditor
            variable={editedVariable}
            onVariableChange={setEditedVariable}
          />

          <VariableModifierStrategy
            variable={editedVariable}
            onVariableChange={setEditedVariable}
          />
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
