/**
 * Hook for evaluating expressions with backend support and debouncing
 */

import { useState, useEffect, useRef } from 'react';
import type { Controls } from '../types';
import { BACKEND_API } from '../../../config/backend';

interface UseExpressionEvaluationProps {
  parsedControls: Controls | null;
  values: Record<string, number>;
}

export function useExpressionEvaluation({
  parsedControls,
  values,
}: UseExpressionEvaluationProps) {
  const [evaluatedExpressions, setEvaluatedExpressions] = useState<Record<string, number>>({});
  const evaluationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Evaluate all expressions server-side when values change (debounced to reduce API calls)
  useEffect(() => {
    if (!parsedControls || Object.keys(values).length === 0) return;

    // Clear any existing timeout
    if (evaluationTimeoutRef.current) {
      clearTimeout(evaluationTimeoutRef.current);
    }

    const evaluateServerSide = async () => {
      try {
        // Collect all unique expressions
        const expressions = new Set<string>();

        parsedControls.objectives?.forEach(obj => expressions.add(obj.expression));
        parsedControls.properties?.forEach(prop => expressions.add(prop.expression));
        parsedControls.constraints?.forEach(con => expressions.add(con.expression));

        // Prepare variables for backend: map categorical indices to string values
        const variablesForEval: Record<string, string | number> = { ...values };

        parsedControls.variables?.forEach(variable => {
          if (variable.type === 'categorical' && variable.categories) {
            const index = values[variable.name];
            if (typeof index === 'number' && variable.categories[index]) {
              variablesForEval[variable.name] = variable.categories[index];
            }
          }
        });

        const response = await fetch(BACKEND_API.evaluate, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expressions: Array.from(expressions),
            variables: variablesForEval,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const newCache: Record<string, number> = {};

          data.results.forEach((result: any) => {
            if (result.value !== null && !result.error) {
              newCache[result.expression] = result.value;
            } else if (result.error) {
              console.warn('[ControlsPanel] Backend evaluation error:', result.expression, result.error);
            }
          });

          setEvaluatedExpressions(newCache);
        } else {
          console.error('[ControlsPanel] Backend evaluation request failed:', response.status);
        }
      } catch (error) {
        console.warn('[ControlsPanel] Backend unavailable, using client-side fallback:', error);
        // Clear cache so fallback is used
        setEvaluatedExpressions({});
      }
    };

    // Debounce API calls: wait 400ms after user stops interacting before evaluating
    evaluationTimeoutRef.current = setTimeout(evaluateServerSide, 400);

    // Cleanup function to clear timeout on unmount or when dependencies change
    return () => {
      if (evaluationTimeoutRef.current) {
        clearTimeout(evaluationTimeoutRef.current);
      }
    };
  }, [values, parsedControls]);

  return { evaluatedExpressions };
}

