/**
 * Service for aggregating Controls from multiple messages
 * Intelligently merges incremental updates and full formalizations
 */

import type { Controls, Variable, Objective, Constraint, Property } from '../components/controls/types';
import type { Message } from './sessionManager';

/**
 * Aggregate Controls from session messages
 * Priority: Full formalization > Aggregated incremental updates
 */
export function aggregateControlsFromMessages(messages: Message[]): Controls | null {
  if (!messages || messages.length === 0) {
    return null;
  }

  // First, check for full formalization (highest priority)
  const formalizationMessage = messages.find(
    (m) => m.metadata?.type === 'formalization' && m.metadata?.structuredData
  );

  if (formalizationMessage?.metadata?.structuredData) {
    const formalizedControls = formalizationMessage.metadata.structuredData as Controls;
    // Validate that it has at least variables
    if (formalizedControls && Array.isArray(formalizedControls.variables) && formalizedControls.variables.length > 0) {
      return formalizedControls;
    }
  }

  // Otherwise, aggregate from incremental updates
  return aggregateIncrementalUpdates(messages);
}

/**
 * Aggregate Controls from incremental update messages
 * Merges variables, objectives, constraints, and properties intelligently
 */
function aggregateIncrementalUpdates(messages: Message[]): Controls | null {
  const aggregated: Partial<Controls> = {
    variables: [],
    objectives: [],
    constraints: [],
    properties: [],
  };

  // Process messages in chronological order (oldest first)
  const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  for (const message of sortedMessages) {
    const metadata = message.metadata;
    if (!metadata || !metadata.structuredData) continue;

    const updateType = metadata.type;
    const data = metadata.structuredData as Partial<Controls>;

    // Merge variables first (needed for constraint merging)
    if (data.variables && Array.isArray(data.variables)) {
      aggregated.variables = mergeVariables(aggregated.variables || [], data.variables);
    }

    // Merge objectives
    if (data.objectives && Array.isArray(data.objectives)) {
      aggregated.objectives = mergeObjectives(aggregated.objectives || [], data.objectives);
    }

    // Merge constraints (and merge simple bounds into variables)
    // Note: This modifies aggregated.variables in place
    if (data.constraints && Array.isArray(data.constraints)) {
      aggregated.constraints = mergeConstraints(aggregated.constraints || [], data.constraints, aggregated.variables || []);
    }

    // Merge properties
    if (data.properties && Array.isArray(data.properties)) {
      aggregated.properties = mergeProperties(aggregated.properties || [], data.properties);
    }
  }

  // Return null if no variables found (variables are required)
  if (!aggregated.variables || aggregated.variables.length === 0) {
    return null;
  }

  // Clean up empty arrays
  const result: Controls = {
    variables: aggregated.variables,
  };

  if (aggregated.objectives && aggregated.objectives.length > 0) {
    result.objectives = aggregated.objectives;
  }

  if (aggregated.constraints && aggregated.constraints.length > 0) {
    result.constraints = aggregated.constraints;
  }

  if (aggregated.properties && aggregated.properties.length > 0) {
    result.properties = aggregated.properties;
  }

  return result;
}

/**
 * Merge variables intelligently
 * Matches by name, updates fields that changed, keeps others
 */
function mergeVariables(existing: Variable[], newVars: Variable[]): Variable[] {
  const merged = [...existing];
  const existingMap = new Map<string, number>();
  merged.forEach((v, idx) => existingMap.set(v.name, idx));

  for (const newVar of newVars) {
    const existingIdx = existingMap.get(newVar.name);
    if (existingIdx !== undefined) {
      // Variable exists, merge intelligently
      const existingVar = merged[existingIdx];
      merged[existingIdx] = {
        ...existingVar,
        ...newVar,
        // Preserve existing values for fields not provided in update
        min: newVar.min !== undefined ? newVar.min : existingVar.min,
        max: newVar.max !== undefined ? newVar.max : existingVar.max,
        default: newVar.default !== undefined ? newVar.default : existingVar.default,
        unit: newVar.unit !== undefined ? newVar.unit : existingVar.unit,
        description: newVar.description || existingVar.description,
        categories: newVar.categories || existingVar.categories,
        currentCategory: newVar.currentCategory || existingVar.currentCategory,
        modifierStrategy: newVar.modifierStrategy || existingVar.modifierStrategy,
      };
    } else {
      // New variable, add it
      merged.push(newVar);
      existingMap.set(newVar.name, merged.length - 1);
    }
  }

  return merged;
}

/**
 * Merge objectives intelligently
 * Matches by name, updates if changed
 */
function mergeObjectives(existing: Objective[], newObjs: Objective[]): Objective[] {
  const merged = [...existing];
  const existingMap = new Map<string, number>();
  merged.forEach((o, idx) => existingMap.set(o.name, idx));

  for (const newObj of newObjs) {
    const existingIdx = existingMap.get(newObj.name);
    if (existingIdx !== undefined) {
      // Objective exists, replace with new version (latest wins)
      merged[existingIdx] = newObj;
    } else {
      // New objective, add it
      merged.push(newObj);
      existingMap.set(newObj.name, merged.length - 1);
    }
  }

  return merged;
}

/**
 * Merge simple bound constraints into variable min/max values
 * Returns updated variables and filtered constraints
 */
function mergeSimpleBoundConstraints(
  variables: Variable[],
  constraints: Constraint[]
): { variables: Variable[]; constraints: Constraint[] } {
  const updatedVars = variables.map(v => ({ ...v }));
  const remainingConstraints: Constraint[] = [];

  for (const constraint of constraints) {
    const expr = constraint.expression.replace(/\s/g, ''); // Remove whitespace
    let merged = false;

    // Check each variable to see if this is a simple bound constraint
    for (const variable of updatedVars) {
      if (variable.type === 'categorical') continue; // Skip categorical variables

      const varName = variable.name;
      const escapedVarName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Match patterns like "varName>=value" or "varName>value"
      const geMatch = expr.match(new RegExp(`^${escapedVarName}>=(-?\\d+(?:\\.\\d+)?)$`));
      const gtMatch = expr.match(new RegExp(`^${escapedVarName}>(-?\\d+(?:\\.\\d+)?)$`));
      const leMatch = expr.match(new RegExp(`^${escapedVarName}<=(-?\\d+(?:\\.\\d+)?)$`));
      const ltMatch = expr.match(new RegExp(`^${escapedVarName}<(-?\\d+(?:\\.\\d+)?)$`));
      
      // Match reverse patterns like "value<=varName" or "value<varName"
      const revGeMatch = expr.match(new RegExp(`^(-?\\d+(?:\\.\\d+)?)<=${escapedVarName}$`));
      const revGtMatch = expr.match(new RegExp(`^(-?\\d+(?:\\.\\d+)?)<${escapedVarName}$`));

      if (geMatch) {
        // varName >= value -> update min
        const value = parseFloat(geMatch[1]);
        const currentMin = variable.min;
        if (currentMin === undefined || value > currentMin) {
          variable.min = value;
          merged = true;
        }
      } else if (gtMatch) {
        // varName > value -> update min (with small epsilon for strict inequality)
        const value = parseFloat(gtMatch[1]);
        const minValue = value + 0.0001; // Small epsilon for strict >
        const currentMin = variable.min;
        if (currentMin === undefined || minValue > currentMin) {
          variable.min = minValue;
          merged = true;
        }
      } else if (leMatch) {
        // varName <= value -> update max
        const value = parseFloat(leMatch[1]);
        const currentMax = variable.max;
        if (currentMax === undefined || value < currentMax) {
          variable.max = value;
          merged = true;
        }
      } else if (ltMatch) {
        // varName < value -> update max (with small epsilon for strict inequality)
        const value = parseFloat(ltMatch[1]);
        const maxValue = value - 0.0001; // Small epsilon for strict <
        const currentMax = variable.max;
        if (currentMax === undefined || maxValue < currentMax) {
          variable.max = maxValue;
          merged = true;
        }
      } else if (revGeMatch) {
        // value <= varName -> same as varName >= value
        const value = parseFloat(revGeMatch[1]);
        const currentMin = variable.min;
        if (currentMin === undefined || value > currentMin) {
          variable.min = value;
          merged = true;
        }
      } else if (revGtMatch) {
        // value < varName -> same as varName > value
        const value = parseFloat(revGtMatch[1]);
        const minValue = value + 0.0001;
        const currentMin = variable.min;
        if (currentMin === undefined || minValue > currentMin) {
          variable.min = minValue;
          merged = true;
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
 * Merge constraints intelligently
 * Matches by expression, updates description if changed
 * Also merges simple bound constraints into variable min/max values
 */
function mergeConstraints(existing: Constraint[], newCons: Constraint[], variables: Variable[]): Constraint[] {
  // First merge new constraints with existing ones
  const merged = [...existing];
  const existingMap = new Map<string, number>();
  merged.forEach((c, idx) => existingMap.set(c.expression, idx));

  for (const newCon of newCons) {
    const existingIdx = existingMap.get(newCon.expression);
    if (existingIdx !== undefined) {
      // Constraint exists, update description and title if provided
      merged[existingIdx] = {
        ...merged[existingIdx],
        description: newCon.description || merged[existingIdx].description,
        title: newCon.title || merged[existingIdx].title,
      };
    } else {
      // New constraint, add it
      merged.push(newCon);
      existingMap.set(newCon.expression, merged.length - 1);
    }
  }

  // Then merge simple bound constraints into variable min/max
  const result = mergeSimpleBoundConstraints([...variables], merged);
  
  // Update variables array by replacing elements
  variables.splice(0, variables.length, ...result.variables);

  return result.constraints;
}

/**
 * Merge properties intelligently
 * Matches by name, updates if changed
 */
function mergeProperties(existing: Property[], newProps: Property[]): Property[] {
  const merged = [...existing];
  const existingMap = new Map<string, number>();
  merged.forEach((p, idx) => existingMap.set(p.name, idx));

  for (const newProp of newProps) {
    const existingIdx = existingMap.get(newProp.name);
    if (existingIdx !== undefined) {
      // Property exists, replace with new version (latest wins)
      merged[existingIdx] = newProp;
    } else {
      // New property, add it
      merged.push(newProp);
      existingMap.set(newProp.name, merged.length - 1);
    }
  }

  return merged;
}

/**
 * Get summary of aggregated controls for UI display
 */
export function getControlsSummary(controls: Controls | null): {
  variableCount: number;
  objectiveCount: number;
  constraintCount: number;
  propertyCount: number;
  isPartial: boolean;
} {
  if (!controls) {
    return {
      variableCount: 0,
      objectiveCount: 0,
      constraintCount: 0,
      propertyCount: 0,
      isPartial: false,
    };
  }

  return {
    variableCount: controls.variables?.length || 0,
    objectiveCount: controls.objectives?.length || 0,
    constraintCount: controls.constraints?.length || 0,
    propertyCount: controls.properties?.length || 0,
    isPartial: !controls.objectives || controls.objectives.length === 0,
  };
}

