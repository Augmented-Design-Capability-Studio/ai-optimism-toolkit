/**
 * Parser for extracting structured data from AI responses
 * Supports both explicit JSON blocks and heuristic extraction from natural language
 */

import type { Controls, Variable, Objective, Constraint, Property } from '../components/controls/types';

export interface PartialControls {
  variables?: Variable[];
  objectives?: Objective[];
  constraints?: Constraint[];
  properties?: Property[];
}

/**
 * Extract structured data from AI response text
 * Looks for explicit JSON blocks first, then tries heuristic extraction
 */
export function parseStructuredData(text: string): PartialControls | null {
  // First, try to find explicit JSON blocks
  const explicitData = parseExplicitJSON(text);
  if (explicitData) {
    return explicitData;
  }

  // If no explicit JSON found, try heuristic extraction
  // Note: This is a basic implementation - can be enhanced with more sophisticated NLP
  return null; // For now, only support explicit JSON blocks
}

/**
 * Parse explicit JSON blocks from text
 * Looks for ```json ... ``` blocks or standalone JSON
 */
function parseExplicitJSON(text: string): PartialControls | null {
  // Try to find JSON in code blocks
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1]);
      return normalizePartialControls(parsed);
    } catch (e) {
      console.warn('[structuredDataParser] Failed to parse JSON block:', e);
    }
  }

  // Try to find standalone JSON object
  const jsonObjectMatch = text.match(/\{[\s\S]*"variables"[\s\S]*\}|\{[\s\S]*"objectives"[\s\S]*\}|\{[\s\S]*"constraints"[\s\S]*\}|\{[\s\S]*"properties"[\s\S]*\}/);
  if (jsonObjectMatch) {
    try {
      const parsed = JSON.parse(jsonObjectMatch[0]);
      return normalizePartialControls(parsed);
    } catch (e) {
      console.warn('[structuredDataParser] Failed to parse standalone JSON:', e);
    }
  }

  return null;
}

/**
 * Normalize and validate partial controls data
 * Ensures data matches expected structure and types
 */
function normalizePartialControls(data: any): PartialControls | null {
  const result: PartialControls = {};

  // Validate and normalize variables
  if (Array.isArray(data.variables)) {
    result.variables = data.variables
      .map((v: any) => normalizeVariable(v))
      .filter((v: Variable | null) => v !== null) as Variable[];
    if (result.variables.length === 0) {
      delete result.variables;
    }
  }

  // Validate and normalize objectives
  if (Array.isArray(data.objectives)) {
    result.objectives = data.objectives
      .map((o: any) => normalizeObjective(o))
      .filter((o: Objective | null) => o !== null) as Objective[];
    if (result.objectives.length === 0) {
      delete result.objectives;
    }
  }

  // Validate and normalize constraints
  if (Array.isArray(data.constraints)) {
    result.constraints = data.constraints
      .map((c: any) => normalizeConstraint(c))
      .filter((c: Constraint | null) => c !== null) as Constraint[];
    if (result.constraints.length === 0) {
      delete result.constraints;
    }
  }

  // Validate and normalize properties
  if (Array.isArray(data.properties)) {
    result.properties = data.properties
      .map((p: any) => normalizeProperty(p))
      .filter((p: Property | null) => p !== null) as Property[];
    if (result.properties.length === 0) {
      delete result.properties;
    }
  }

  // Return null if no valid data found
  if (!result.variables && !result.objectives && !result.constraints && !result.properties) {
    return null;
  }

  return result;
}

/**
 * Normalize a variable object
 */
function normalizeVariable(v: any): Variable | null {
  if (!v || typeof v.name !== 'string' || !v.name.trim()) {
    return null;
  }

  const type = v.type === 'categorical' ? 'categorical' : 
               v.type === 'discrete' ? 'discrete' : 'continuous';

  const variable: Variable = {
    name: v.name.trim(),
    type,
    description: typeof v.description === 'string' ? v.description.trim() : v.name.trim(),
  };

  // Handle categorical variables
  if (type === 'categorical') {
    if (Array.isArray(v.categories) && v.categories.length > 0) {
      variable.categories = v.categories.map((c: any) => String(c));
      variable.currentCategory = variable.categories![0];
      
      // Preserve attributes if provided
      if (v.attributes && typeof v.attributes === 'object' && v.attributes !== null && !Array.isArray(v.attributes)) {
        variable.attributes = v.attributes;
      }
    } else {
      // Invalid categorical without categories
      return null;
    }
  } else {
    // Handle continuous/discrete variables
    if (typeof v.min === 'number') variable.min = v.min;
    if (typeof v.max === 'number') variable.max = v.max;
    if (typeof v.default === 'number') variable.default = v.default;
    if (typeof v.unit === 'string') variable.unit = v.unit.trim();
  }

  // Preserve modifierStrategy if provided
  if (v.modifierStrategy && typeof v.modifierStrategy === 'object') {
    variable.modifierStrategy = v.modifierStrategy;
  }

  return variable;
}

/**
 * Normalize an objective object
 */
function normalizeObjective(o: any): Objective | null {
  if (!o || typeof o.name !== 'string' || !o.name.trim()) {
    return null;
  }

  if (typeof o.expression !== 'string' || !o.expression.trim()) {
    return null;
  }

  const goal = o.goal === 'maximize' ? 'maximize' : 'minimize';

  return {
    name: o.name.trim(),
    expression: o.expression.trim(),
    goal,
    description: typeof o.description === 'string' ? o.description.trim() : o.name.trim(),
  };
}

/**
 * Normalize a constraint object
 */
function normalizeConstraint(c: any): Constraint | null {
  if (!c || typeof c.expression !== 'string' || !c.expression.trim()) {
    return null;
  }

  return {
    expression: c.expression.trim(),
    description: typeof c.description === 'string' ? c.description.trim() : 'Constraint',
  };
}

/**
 * Normalize a property object
 */
function normalizeProperty(p: any): Property | null {
  if (!p || typeof p.name !== 'string' || !p.name.trim()) {
    return null;
  }

  if (typeof p.expression !== 'string' || !p.expression.trim()) {
    return null;
  }

  const result: Property = {
    name: p.name.trim(),
    expression: p.expression.trim(),
  };
  
  // Only include description if provided (optional for dictionary properties)
  if (typeof p.description === 'string' && p.description.trim()) {
    result.description = p.description.trim();
  }
  
  return result;
}

/**
 * Determine the update type based on what data is present
 */
export function getUpdateType(partialControls: PartialControls): string | null {
  if (partialControls.variables && partialControls.variables.length > 0) {
    return 'variables-update';
  }
  if (partialControls.objectives && partialControls.objectives.length > 0) {
    return 'objectives-update';
  }
  if (partialControls.constraints && partialControls.constraints.length > 0) {
    return 'constraints-update';
  }
  if (partialControls.properties && partialControls.properties.length > 0) {
    return 'properties-update';
  }
  return null;
}

