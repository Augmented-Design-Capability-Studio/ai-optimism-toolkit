/**
 * Hook for evaluating expressions with backend support and debouncing
 */

import { useState, useEffect, useRef } from 'react';
import type { Controls } from '../types';
import { BACKEND_API } from '@/core/config/backend';

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
        // Prepare variables for backend: map categorical indices to string values
        // Also inject variable attributes into the evaluation context
        const variablesForEval: Record<string, any> = { ...values };

        parsedControls.variables?.forEach(variable => {
          if (variable.type === 'categorical' && variable.categories) {
            const index = values[variable.name];
            if (typeof index === 'number' && variable.categories[index]) {
              variablesForEval[variable.name] = variable.categories[index];
            }
            
            // Inject variable attributes into evaluation context
            // Expressions can reference them as: {variable_name}_attributes[category]['attr']
            // e.g., lunch_1_dish_attributes[lunch_1_dish]['cost']
            if (variable.attributes) {
              const attributesKey = `${variable.name}_attributes`;
              variablesForEval[attributesKey] = variable.attributes;
            }
          }
        });

        // Step 1: Evaluate properties first (they may depend on variables)
        // Properties are then injected into the variables dict for use in objectives/constraints
        const propertyExpressions = parsedControls.properties?.map(prop => prop.expression) || [];
        let propertyValues: Record<string, any> = {};

        if (propertyExpressions.length > 0) {
          const propertyResponse = await fetch(BACKEND_API.evaluate, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              expressions: propertyExpressions,
              variables: variablesForEval,
            }),
          });

          if (propertyResponse.ok) {
            const propertyData = await propertyResponse.json();
            parsedControls.properties?.forEach((prop, idx) => {
              const result = propertyData.results[idx];
              if (result && result.value !== null && !result.error) {
                // Property values can be numbers, dictionaries, or other types
                const propValue = result.value;
                propertyValues[prop.name] = propValue;
                // Also add to variablesForEval for subsequent evaluations
                // This allows expressions like dish_attributes[variable]['property'] to work
                // AND allows objectives/constraints to reference properties by name
                variablesForEval[prop.name] = propValue;
              } else if (result && result.error) {
                console.warn(`[useExpressionEvaluation] Property "${prop.name}" evaluation error:`, result.error);
              }
            });
          } else {
            console.warn('[useExpressionEvaluation] Property evaluation request failed:', propertyResponse.status);
          }
        }

        // Step 2: Collect expressions for objectives and constraints
        const expressions = new Set<string>();
        parsedControls.objectives?.forEach(obj => expressions.add(obj.expression));
        parsedControls.constraints?.forEach(con => expressions.add(con.expression));

        // Step 3: Evaluate objectives and constraints (they may depend on variables and properties)
        // Ensure properties are available in variablesForEval before evaluating objectives

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

          // Add property values to cache (only numeric properties are cached for display)
          // Dictionary properties are available in variablesForEval for expression evaluation
          Object.entries(propertyValues).forEach(([name, value]) => {
            if (typeof value === 'number') {
              // Find the property expression to use as key
              const prop = parsedControls.properties?.find(p => p.name === name);
              if (prop) {
                newCache[prop.expression] = value;
              }
            }
            // Note: Dictionary properties (like dish_attributes) are stored in variablesForEval
            // and used in subsequent evaluations, but not cached as displayable numbers
          });

          // Add objective and constraint values to cache
          data.results.forEach((result: any) => {
            if (result.value !== null && !result.error) {
              // Ensure value is numeric for display
              const numValue = typeof result.value === 'number' ? result.value : parseFloat(result.value);
              if (!isNaN(numValue)) {
                newCache[result.expression] = numValue;
              } else {
                console.warn('[useExpressionEvaluation] Non-numeric result for expression:', result.expression, 'value:', result.value);
              }
            } else if (result.error) {
              console.warn('[useExpressionEvaluation] Backend evaluation error for expression:', result.expression);
              console.warn('[useExpressionEvaluation] Error details:', result.error);
              console.warn('[useExpressionEvaluation] Available variables:', Object.keys(variablesForEval));
              // Log property values for debugging
              Object.entries(propertyValues).forEach(([name, value]) => {
                console.warn(`[useExpressionEvaluation] Property "${name}":`, typeof value, value);
              });
            }
          });

          setEvaluatedExpressions(newCache);
        } else {
          const errorText = await response.text();
          console.error('[useExpressionEvaluation] Backend evaluation request failed:', response.status, errorText);
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

