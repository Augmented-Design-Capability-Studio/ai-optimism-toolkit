// Validation utilities for Python expressions

export interface ValidationError {
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validate basic Python expression syntax
 */
export const validatePythonExpression = (expr: string): boolean => {
  if (!expr.trim()) return false;
  
  try {
    // Check balanced parentheses
    const openParens = (expr.match(/\(/g) || []).length;
    const closeParens = (expr.match(/\)/g) || []).length;
    if (openParens !== closeParens) return false;
    
    // Check balanced brackets
    const openBrackets = (expr.match(/\[/g) || []).length;
    const closeBrackets = (expr.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) return false;
    
    // Check for valid characters (Python expression subset)
    const hasValidChars = /^[\w\s+\-*\/.()[\],<>=!&|%]+$/.test(expr);
    if (!hasValidChars) return false;
    
    // Check for common syntax errors
    if (/\(\s*\)/.test(expr)) return false; // Empty parentheses
    if (/[+\-*\/]{2,}/.test(expr)) return false; // Consecutive operators
    if (/^[+\-*\/]|[+\-*\/]$/.test(expr.trim())) return false; // Starts/ends with operator
    
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if expression only references valid variables and functions
 */
export const checkVariableReferences = (
  expr: string, 
  validVariables: string[]
): string[] => {
  // Extract all identifiers from the expression
  const identifiers = expr.match(/\b[a-zA-Z_]\w*\b/g) || [];
  
  // List of allowed Python math functions
  const allowedFunctions = [
    'abs', 'min', 'max', 'sum', 'pow', 'sqrt', 'exp', 'log', 'sin', 'cos', 
    'tan', 'round', 'floor', 'ceil', 'len', 'range'
  ];
  
  // Find undefined variables
  const undefined = identifiers.filter(id => 
    !validVariables.includes(id) && 
    !allowedFunctions.includes(id)
  );
  
  return [...new Set(undefined)]; // Remove duplicates
};

/**
 * Validate a numeric range
 */
export const validateRange = (min: number, max: number): boolean => {
  return !isNaN(min) && !isNaN(max) && min < max;
};

/**
 * Auto-correct common expression typos
 */
export const autoCorrectExpression = (expr: string): string => {
  return expr
    .replace(/\s+/g, ' ')           // Multiple spaces to single
    .replace(/\s*([+\-*\/<>=!])\s*/g, ' $1 ') // Normalize operator spacing
    .trim();
};
