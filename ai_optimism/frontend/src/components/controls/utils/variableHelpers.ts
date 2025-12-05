/**
 * Utility functions for variable management and analysis
 */

import type { Controls, Variable } from '../types';

/**
 * Calculate importance score for a variable
 * Based on usage in objectives/constraints, units, and range
 */
export function getVariableImportance(variable: Variable, controls: Controls | null): number {
  let score = 0;

  // Check if used in objectives
  const usedInObjectives = controls?.objectives?.some(
    obj => obj.expression.includes(variable.name)
  );
  if (usedInObjectives) score += 3;

  // Check if used in constraints
  const usedInConstraints = controls?.constraints?.some(
    con => con.expression.includes(variable.name)
  );
  if (usedInConstraints) score += 2;

  // Has specific unit (suggests importance)
  if (variable.unit && variable.unit.length > 0) score += 1;

  // Small range suggests precision (important)
  if (variable.type !== 'categorical') {
    const range = (variable.max ?? 100) - (variable.min ?? 0);
    if (range <= 10) score += 1;
  }

  return score;
}

/**
 * Sort variables by importance and split into important/other groups
 */
export function getSortedVariables(controls: Controls | null): { important: Variable[], other: Variable[] } {
  if (!controls?.variables) return { important: [], other: [] };

  const scored = controls.variables.map(v => ({
    variable: v,
    score: getVariableImportance(v, controls)
  }));

  scored.sort((a, b) => b.score - a.score);

  // Show variables with score > 1 or at least top 6
  const importantCount = Math.max(
    6,
    scored.filter(s => s.score > 1).length
  );

  return {
    important: scored.slice(0, importantCount).map(s => s.variable),
    other: scored.slice(importantCount).map(s => s.variable)
  };
}

/**
 * Extract variable dependencies from an expression
 */
export function extractDependencies(expression: string | undefined | null, controls: Controls | null): string[] {
  if (!expression || typeof expression !== 'string') {
    return [];
  }
  const variablePattern = /[a-zA-Z_][a-zA-Z0-9_]*/g;
  const matches = expression.match(variablePattern) || [];
  // Only keep variable names that exist in controls.variables
  const validVars = matches.filter(name =>
    controls?.variables?.some(v => v.name === name)
  );
  // Remove duplicates
  return Array.from(new Set(validVars));
}

