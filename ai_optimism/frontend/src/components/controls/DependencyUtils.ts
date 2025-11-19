// Utility functions for tracking and visualizing dependencies between variables, properties, objectives, and constraints

import { Variable } from './VariablesTab';
import { Property } from './PropertiesTab';
import { Objective } from './ObjectivesTab';
import { Constraint } from './ConstraintsTab';

export interface DependencyInfo {
  uses: string[]; // What this item references
  usedBy: { type: 'property' | 'objective' | 'constraint'; name: string; index: number }[]; // What references this item
}

/**
 * Parse an expression to extract variable/property names
 */
export function extractReferences(expression: string): string[] {
  if (!expression) return [];
  
  // Match Python identifiers (variable/property names)
  // This regex matches valid Python identifiers
  const identifierRegex = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
  const matches = expression.match(identifierRegex) || [];
  
  // Filter out Python keywords and built-in functions
  const keywords = new Set([
    'and', 'or', 'not', 'in', 'is', 'if', 'else', 'for', 'while', 'def', 'class',
    'return', 'True', 'False', 'None', 'lambda', 'with', 'as', 'pass', 'break',
    'continue', 'try', 'except', 'finally', 'raise', 'import', 'from',
    // Common math functions
    'abs', 'min', 'max', 'sum', 'len', 'range', 'round', 'pow', 'sqrt', 'exp',
    'log', 'sin', 'cos', 'tan', 'floor', 'ceil',
  ]);
  
  return [...new Set(matches.filter(m => !keywords.has(m)))];
}

/**
 * Get dependency info for a variable
 */
export function getVariableDependencies(
  variableName: string,
  properties: Property[],
  objectives: Objective[],
  constraints: Constraint[]
): DependencyInfo {
  const usedBy: DependencyInfo['usedBy'] = [];
  
  // Check properties
  properties.forEach((prop, idx) => {
    const refs = extractReferences(prop.expression);
    if (refs.includes(variableName)) {
      usedBy.push({ type: 'property', name: prop.name, index: idx });
    }
  });
  
  // Check objectives
  objectives.forEach((obj, idx) => {
    const refs = extractReferences(obj.expression);
    if (refs.includes(variableName)) {
      usedBy.push({ type: 'objective', name: obj.name, index: idx });
    }
  });
  
  // Check constraints
  constraints.forEach((con, idx) => {
    const refs = extractReferences(con.expression);
    if (refs.includes(variableName)) {
      usedBy.push({ type: 'constraint', name: `Constraint ${idx + 1}`, index: idx });
    }
  });
  
  return { uses: [], usedBy };
}

/**
 * Get dependency info for a property
 */
export function getPropertyDependencies(
  propertyIndex: number,
  properties: Property[],
  variables: Variable[],
  objectives: Objective[],
  constraints: Constraint[]
): DependencyInfo {
  const property = properties[propertyIndex];
  if (!property) return { uses: [], usedBy: [] };
  
  // What this property uses
  const uses = extractReferences(property.expression);
  
  // What uses this property
  const usedBy: DependencyInfo['usedBy'] = [];
  const propertyName = property.name;
  
  // Check later properties (properties can only reference earlier ones)
  properties.slice(propertyIndex + 1).forEach((prop, idx) => {
    const refs = extractReferences(prop.expression);
    if (refs.includes(propertyName)) {
      usedBy.push({ type: 'property', name: prop.name, index: propertyIndex + 1 + idx });
    }
  });
  
  // Check objectives
  objectives.forEach((obj, idx) => {
    const refs = extractReferences(obj.expression);
    if (refs.includes(propertyName)) {
      usedBy.push({ type: 'objective', name: obj.name, index: idx });
    }
  });
  
  // Check constraints
  constraints.forEach((con, idx) => {
    const refs = extractReferences(con.expression);
    if (refs.includes(propertyName)) {
      usedBy.push({ type: 'constraint', name: `Constraint ${idx + 1}`, index: idx });
    }
  });
  
  return { uses, usedBy };
}

/**
 * Get dependency info for an objective
 */
export function getObjectiveDependencies(
  objectiveIndex: number,
  objectives: Objective[],
  variables: Variable[],
  properties: Property[]
): DependencyInfo {
  const objective = objectives[objectiveIndex];
  if (!objective) return { uses: [], usedBy: [] };
  
  const uses = extractReferences(objective.expression);
  
  // Objectives are not used by anything (they're the end goal)
  return { uses, usedBy: [] };
}

/**
 * Get dependency info for a constraint
 */
export function getConstraintDependencies(
  constraintIndex: number,
  constraints: Constraint[],
  variables: Variable[],
  properties: Property[]
): DependencyInfo {
  const constraint = constraints[constraintIndex];
  if (!constraint) return { uses: [], usedBy: [] };
  
  const uses = extractReferences(constraint.expression);
  
  // Constraints are not used by anything (they're validation rules)
  return { uses, usedBy: [] };
}

/**
 * Highlight references in an expression with color coding
 * Returns an array of segments with type information
 */
export interface ExpressionSegment {
  text: string;
  type: 'variable' | 'property' | 'text';
  name?: string; // The variable/property name if type is not 'text'
}

export function highlightExpression(
  expression: string,
  variables: Variable[],
  properties: Property[]
): ExpressionSegment[] {
  if (!expression) return [{ text: expression, type: 'text' }];
  
  const varNames = new Set(variables.map(v => v.name));
  const propNames = new Set(properties.map(p => p.name));
  
  const segments: ExpressionSegment[] = [];
  const identifierRegex = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = identifierRegex.exec(expression)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      segments.push({ text: expression.slice(lastIndex, match.index), type: 'text' });
    }
    
    // Add the identifier with its type
    const identifier = match[0];
    if (varNames.has(identifier)) {
      segments.push({ text: identifier, type: 'variable', name: identifier });
    } else if (propNames.has(identifier)) {
      segments.push({ text: identifier, type: 'property', name: identifier });
    } else {
      segments.push({ text: identifier, type: 'text' });
    }
    
    lastIndex = match.index + identifier.length;
  }
  
  // Add remaining text
  if (lastIndex < expression.length) {
    segments.push({ text: expression.slice(lastIndex), type: 'text' });
  }
  
  return segments;
}
