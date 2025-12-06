/**
 * Utility functions for expression evaluation and parsing
 */

/**
 * Simple expression evaluator with cached results
 * Falls back to client-side eval for simple numeric expressions
 */
export function evaluateExpression(
  expression: string,
  values: Record<string, number>,
  evaluatedExpressions: Record<string, number>
): number | undefined {
  // Check if we have a cached evaluation from backend
  if (evaluatedExpressions[expression] !== undefined) {
    return evaluatedExpressions[expression];
  }

  // Quick check: if expression contains Python-specific syntax, skip client-side eval
  // This avoids expensive regex work for expressions we know will fail
  const hasPythonSyntax = /(if|else|==|!=|in|for|\[.*\]|".*"|'.*')/.test(expression);
  if (hasPythonSyntax) {
    // For complex expressions, return undefined if backend hasn't evaluated yet
    // Backend evaluation is debounced (400ms), so this is expected during typing
    // No need to log warnings - backend will evaluate shortly
    return undefined;
  }

  // Fallback to client-side eval for simple numeric expressions only
  // This is safe for basic arithmetic with known variables
  try {
    // Replace variable names with their values
    let expr = expression;
    Object.entries(values).forEach(([name, value]) => {
      expr = expr.replace(new RegExp(`\\b${name}\\b`, 'g'), String(value));
    });

    // Only eval if expression looks safe (numbers and basic operators)
    // This prevents executing complex Python-specific syntax client-side
    if (/^[\d\s+\-*/().]+$/.test(expr)) {
      // eslint-disable-next-line no-eval
      return eval(expr);
    }

    return undefined;
  } catch (error) {
    console.error('[ControlsPanel] Evaluation error:', expression, error);
    return undefined;
  }
}

/**
 * Parse constraint expression for display purposes (LHS vs RHS)
 */
export function parseConstraintForDisplay(expr: string): { lhs: string; rhs: string; operator: string } | null {
  const operators = ['<=', '>=', '==', '!=', '<', '>'];
  for (const op of operators) {
    const idx = expr.indexOf(op);
    if (idx > 0) {
      return {
        lhs: expr.substring(0, idx).trim(),
        rhs: expr.substring(idx + op.length).trim(),
        operator: op,
      };
    }
  }
  return null;
}

