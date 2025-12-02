/**
 * Hook for managing controls state and values
 */

import { useState, useEffect } from 'react';
import type { Controls, Variable } from '../types';

interface UseControlsStateProps {
  controls?: unknown;
  initialValues?: Record<string, number>;
  onVariablesChange?: (variables: Record<string, number>) => void;
}

export function useControlsState({
  controls,
  initialValues,
  onVariablesChange,
}: UseControlsStateProps) {
  const [parsedControls, setParsedControls] = useState<Controls | null>(null);
  const [values, setValues] = useState<Record<string, number>>({});

  // Parse controls when they change
  useEffect(() => {
    if (controls) {
      const c = controls as Controls;
      setParsedControls(c);

      // Initialize values from defaults
      const initialValues: Record<string, number> = {};
      c.variables?.forEach((v: Variable) => {
        if (v.type === 'categorical') {
          initialValues[v.name] = 0; // Index of first category
        } else {
          initialValues[v.name] = v.default ?? v.min ?? 0;
        }
      });
      setValues(initialValues);
    } else {
      // Clear state when controls become null
      setParsedControls(null);
      setValues({});
    }
  }, [controls]);

  // Apply optimization results when initialValues change
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      console.log('[ControlsPanel] Applying optimization results:', initialValues);
      setValues(prev => ({ ...prev, ...initialValues }));
    }
  }, [initialValues]);

  // Notify parent of value changes
  useEffect(() => {
    if (Object.keys(values).length > 0) {
      onVariablesChange?.(values);
    }
  }, [values, onVariablesChange]);

  const handleValueChange = (name: string, value: number) => {
    setValues(prev => ({ ...prev, [name]: value }));
  };

  return {
    parsedControls,
    setParsedControls,
    values,
    setValues,
    handleValueChange,
  };
}

