/**
 * Hook for managing variable editing, saving, and deletion
 */

import { useState } from 'react';
import type { Controls, Variable } from '../types';

interface UseVariableManagementProps {
  parsedControls: Controls | null;
  setParsedControls: (controls: Controls) => void;
  values: Record<string, number>;
  setValues: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onControlsUpdate?: (controls: unknown) => void;
}

export function useVariableManagement({
  parsedControls,
  setParsedControls,
  values,
  setValues,
  onControlsUpdate,
}: UseVariableManagementProps) {
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleEditVariable = (variable: Variable) => {
    setEditingVariable(variable);
    setEditDialogOpen(true);
  };

  const handleSaveVariable = (updatedVariable: Variable) => {
    if (!parsedControls) return;

    // Update the variable in the controls
    const updatedVariables = parsedControls.variables?.map(v =>
      v.name === editingVariable?.name ? updatedVariable : v
    );

    const updatedControls = {
      ...parsedControls,
      variables: updatedVariables,
    };

    setParsedControls(updatedControls);

    // Update value if type changed or range changed
    if (updatedVariable.type === 'categorical') {
      setValues(prev => ({ ...prev, [updatedVariable.name]: 0 }));
    } else {
      const currentValue = values[updatedVariable.name];
      const min = updatedVariable.min ?? 0;
      const max = updatedVariable.max ?? 100;
      // Clamp existing value to new range
      const clampedValue = Math.max(min, Math.min(max, currentValue ?? min));
      setValues(prev => ({ ...prev, [updatedVariable.name]: clampedValue }));
    }

    // Notify parent of controls update
    onControlsUpdate?.(updatedControls);
  };

  const handleDeleteVariable = () => {
    if (!parsedControls || !editingVariable) return;

    const updatedVariables = parsedControls.variables?.filter(
      v => v.name !== editingVariable.name
    );

    const updatedControls = {
      ...parsedControls,
      variables: updatedVariables,
    };

    setParsedControls(updatedControls);

    // Remove value
    const newValues = { ...values };
    delete newValues[editingVariable.name];
    setValues(newValues);

    // Notify parent
    onControlsUpdate?.(updatedControls);

    setEditDialogOpen(false);
  };

  return {
    editingVariable,
    editDialogOpen,
    setEditDialogOpen,
    handleEditVariable,
    handleSaveVariable,
    handleDeleteVariable,
  };
}

