/**
 * Utility functions for controls generation
 * Extracted from route.ts to improve maintainability
 */

/**
 * Merge simple bound constraints into variable min/max values
 * Returns updated variables and filtered constraints
 * Preserves all properties from input variables and constraints
 */
export function mergeSimpleBoundConstraints<
  TVar extends { name: string; type: string; min?: number; max?: number; [key: string]: any },
  TConstraint extends { expression: string; [key: string]: any }
>(
  variables: TVar[],
  constraints: TConstraint[]
): { variables: TVar[]; constraints: TConstraint[] } {
  // Create a copy to avoid mutating the original - spread preserves all properties
  const updatedVars: TVar[] = variables.map(v => ({ ...v }));
  const remainingConstraints: TConstraint[] = [];

  for (const constraint of constraints) {
    const expr = constraint.expression.replace(/\s/g, ''); // Remove whitespace
    let merged = false;

    // Check each variable to see if this is a simple bound constraint
    for (const variable of updatedVars) {
      if (variable.type === 'categorical') continue; // Skip categorical variables

      const varName = variable.name;
      const currentMin = variable.min;
      const currentMax = variable.max;

      // Patterns: varName >= value, varName > value, varName <= value, varName < value
      // Also: value <= varName, value < varName, value >= varName, value > varName
      
      // Match patterns like "varName>=value" or "varName>value"
      const geMatch = expr.match(new RegExp(`^${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}>=(-?\\d+(?:\\.\\d+)?)$`));
      const gtMatch = expr.match(new RegExp(`^${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}>(-?\\d+(?:\\.\\d+)?)$`));
      const leMatch = expr.match(new RegExp(`^${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<=(-?\\d+(?:\\.\\d+)?)$`));
      const ltMatch = expr.match(new RegExp(`^${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<(-?\\d+(?:\\.\\d+)?)$`));
      
      // Match reverse patterns like "value<=varName" or "value<varName"
      const revGeMatch = expr.match(new RegExp(`^(-?\\d+(?:\\.\\d+)?)<=${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
      const revGtMatch = expr.match(new RegExp(`^(-?\\d+(?:\\.\\d+)?)<${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
      const revLeMatch = expr.match(new RegExp(`^(-?\\d+(?:\\.\\d+)?)<=${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
      const revLtMatch = expr.match(new RegExp(`^(-?\\d+(?:\\.\\d+)?)<${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));

      if (geMatch) {
        // varName >= value -> update min
        const value = parseFloat(geMatch[1]);
        if (currentMin === undefined || value > currentMin) {
          variable.min = value;
          merged = true;
          console.log(`[Generate] Merged constraint "${constraint.expression}" into ${varName}.min = ${value}`);
        }
      } else if (gtMatch) {
        // varName > value -> update min (with small epsilon for strict inequality)
        const value = parseFloat(gtMatch[1]);
        const minValue = value + 0.0001; // Small epsilon for strict >
        if (currentMin === undefined || minValue > currentMin) {
          variable.min = minValue;
          merged = true;
          console.log(`[Generate] Merged constraint "${constraint.expression}" into ${varName}.min = ${minValue}`);
        }
      } else if (leMatch) {
        // varName <= value -> update max
        const value = parseFloat(leMatch[1]);
        if (currentMax === undefined || value < currentMax) {
          variable.max = value;
          merged = true;
          console.log(`[Generate] Merged constraint "${constraint.expression}" into ${varName}.max = ${value}`);
        }
      } else if (ltMatch) {
        // varName < value -> update max (with small epsilon for strict inequality)
        const value = parseFloat(ltMatch[1]);
        const maxValue = value - 0.0001; // Small epsilon for strict <
        if (currentMax === undefined || maxValue < currentMax) {
          variable.max = maxValue;
          merged = true;
          console.log(`[Generate] Merged constraint "${constraint.expression}" into ${varName}.max = ${maxValue}`);
        }
      } else if (revGeMatch || revLeMatch) {
        // value <= varName -> same as varName >= value
        const value = parseFloat((revGeMatch || revLeMatch)![1]);
        if (currentMin === undefined || value > currentMin) {
          variable.min = value;
          merged = true;
          console.log(`[Generate] Merged constraint "${constraint.expression}" into ${varName}.min = ${value}`);
        }
      } else if (revGtMatch || revLtMatch) {
        // value < varName -> same as varName > value
        const value = parseFloat((revGtMatch || revLtMatch)![1]);
        const minValue = value + 0.0001;
        if (currentMin === undefined || minValue > currentMin) {
          variable.min = minValue;
          merged = true;
          console.log(`[Generate] Merged constraint "${constraint.expression}" into ${varName}.min = ${minValue}`);
        }
      }

      if (merged) break;
    }

    if (!merged) {
      // Keep constraint if it wasn't merged into a variable bound
      remainingConstraints.push(constraint);
    }
  }

  return { variables: updatedVars, constraints: remainingConstraints };
}

/**
 * Clean attributes to ensure only primitive values (string, number, boolean)
 * Filters out any nested objects or arrays
 */
export function cleanAttributes(attributes: Record<string, any> | undefined): Record<string, Record<string, string | number | boolean>> | undefined {
  if (!attributes) return undefined;
  
  const cleaned: Record<string, Record<string, string | number | boolean>> = {};
  
  for (const [category, categoryAttrs] of Object.entries(attributes)) {
    if (typeof categoryAttrs !== 'object' || categoryAttrs === null || Array.isArray(categoryAttrs)) {
      continue; // Skip invalid category attributes
    }
    
    cleaned[category] = {};
    for (const [attrKey, attrValue] of Object.entries(categoryAttrs)) {
      // Only keep primitive values
      if (typeof attrValue === 'string' || typeof attrValue === 'number' || typeof attrValue === 'boolean') {
        cleaned[category][attrKey] = attrValue;
      }
      // Skip objects, arrays, null, undefined - they're not primitives
    }
  }
  
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

/**
 * Transform expression syntax from old patterns to direct attribute access
 * This fixes expressions generated by AI that use incorrect syntax
 * 
 * Note: With CategoricalVariable wrapper, expressions should use direct access: variable.attribute_name
 * This function handles backward compatibility transformations
 */
export function transformAttributeExpressions(expression: string, variableNames: string[]): string {
  let transformed = expression;
  
  for (const varName of variableNames) {
    // Transform old patterns to direct attribute access
    // Pattern 1: variable_attributes[variable]['attr'] -> variable.attr
    const pattern1 = new RegExp(`\\b${varName}_attributes\\[${varName}\\]\\s*\\[\\s*['"]([^'"]+)['"]\\s*\\]`, 'g');
    transformed = transformed.replace(pattern1, (match, attrName) => {
      return `${varName}.${attrName}`;
    });
    
    // Pattern 2: variable.attributes[variable]['attr'] -> variable.attr (if still present)
    const pattern2 = new RegExp(`\\b${varName}\\.attributes\\[${varName}\\]\\s*\\[\\s*['"]([^'"]+)['"]\\s*\\]`, 'g');
    transformed = transformed.replace(pattern2, (match, attrName) => {
      return `${varName}.${attrName}`;
    });
  }
  
  return transformed;
}

/**
 * Validate that a property is not a static data structure (dictionary/list)
 * Properties should be computed expressions, not data storage
 */
export function isValidProperty(property: { name: string; expression: string }): boolean {
  const expr = property.expression.trim();
  
  // Allow simple numeric constants (weights)
  if (/^-?\d+(\.\d+)?$/.test(expr)) {
    return true;
  }
  
  // Try to parse as JSON to detect static data structures
  try {
    const parsed = JSON.parse(expr);
    
    // If it's a number or boolean, it's fine (weight constants)
    if (typeof parsed === 'number' || typeof parsed === 'boolean') {
      return true;
    }
    
    // If it parses as an object or array, it's likely a data structure
    if (typeof parsed === 'object' && parsed !== null) {
      // Check if it's a nested dictionary (category data structure)
      if (!Array.isArray(parsed)) {
        const values = Object.values(parsed);
        // If all values are objects, it's likely category data (should be in attributes)
        if (values.length > 0 && values.every(v => typeof v === 'object' && v !== null && !Array.isArray(v))) {
          return false; // This is category data - should be in variable attributes
        }
      }
      // If it's an array, it's likely a static list (shouldn't be a property)
      if (Array.isArray(parsed)) {
        return false; // Static lists shouldn't be properties
      }
      // Reject object literals - they should be in attributes or computed
      return false;
    }
  } catch {
    // If it doesn't parse as JSON, it's likely a valid expression (contains variables, functions, etc.)
    return true;
  }
  
  return true; // Default to valid if we can't determine
}

/**
 * Extract attributes from formalization JSON in description
 */
export function extractAttributesFromFormalization(description: string): Record<string, Record<string, Record<string, string | number | boolean>>> {
  const attributes: Record<string, Record<string, Record<string, string | number | boolean>>> = {};
  
  try {
    // Look for JSON blocks in description
    const jsonMatch = description.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      // Try without code fences
      const jsonObjectMatch = description.match(/(\{[\s\S]*"variables"[\s\S]*\})/);
      if (jsonObjectMatch) {
        const parsed = JSON.parse(jsonObjectMatch[1]);
        if (parsed.variables && Array.isArray(parsed.variables)) {
          for (const variable of parsed.variables) {
            if (variable.type === 'categorical' && variable.attributes) {
              attributes[variable.name] = variable.attributes;
            }
          }
        }
      }
    } else {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.variables && Array.isArray(parsed.variables)) {
        for (const variable of parsed.variables) {
          if (variable.type === 'categorical' && variable.attributes) {
            attributes[variable.name] = variable.attributes;
          }
        }
      }
    }
    if (Object.keys(attributes).length > 0) {
      console.log('[Generate] Extracted attributes from formalization JSON for', Object.keys(attributes).length, 'variables');
    }
  } catch (e) {
    // If parsing fails, continue without extracting attributes
    console.warn('[Generate] Could not extract attributes from formalization:', e);
  }
  
  return attributes;
}

