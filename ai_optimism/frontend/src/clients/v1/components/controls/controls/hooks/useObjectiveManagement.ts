/**
 * Hook for managing objective editing, saving, and deletion
 */

import { useState } from 'react';
import type { Controls, Objective } from '../types';

interface UseObjectiveManagementProps {
  parsedControls: Controls | null;
  setParsedControls: (controls: Controls) => void;
  onControlsUpdate?: (controls: unknown) => void;
}

export function useObjectiveManagement({
  parsedControls,
  setParsedControls,
  onControlsUpdate,
}: UseObjectiveManagementProps) {
  const [editingObjective, setEditingObjective] = useState<number | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleEditObjective = (index: number) => {
    setEditingObjective(index);
    setEditDialogOpen(true);
  };

  const handleSaveObjective = (updatedObjective: Objective) => {
    if (!parsedControls || editingObjective === null) return;

    const updatedObjectives = parsedControls.objectives?.map((obj, idx) =>
      idx === editingObjective ? updatedObjective : obj
    );

    const updatedControls = {
      ...parsedControls,
      objectives: updatedObjectives,
    };

    setParsedControls(updatedControls);

    // Notify parent of controls update
    onControlsUpdate?.(updatedControls);

    setEditDialogOpen(false);
    setEditingObjective(null);
  };

  const handleDeleteObjective = () => {
    if (!parsedControls || editingObjective === null) return;

    // Don't allow deleting if it's the only objective
    if (parsedControls.objectives && parsedControls.objectives.length <= 1) {
      return;
    }

    const updatedObjectives = parsedControls.objectives?.filter(
      (_, idx) => idx !== editingObjective
    );

    const updatedControls = {
      ...parsedControls,
      objectives: updatedObjectives,
    };

    setParsedControls(updatedControls);

    // Notify parent
    onControlsUpdate?.(updatedControls);

    setEditDialogOpen(false);
    setEditingObjective(null);
  };

  const getEditingObjective = (): Objective | null => {
    if (!parsedControls || editingObjective === null) return null;
    return parsedControls.objectives?.[editingObjective] || null;
  };

  return {
    editingObjective: getEditingObjective(),
    editingObjectiveIndex: editingObjective,
    editDialogOpen,
    setEditDialogOpen,
    handleEditObjective,
    handleSaveObjective,
    handleDeleteObjective,
  };
}

