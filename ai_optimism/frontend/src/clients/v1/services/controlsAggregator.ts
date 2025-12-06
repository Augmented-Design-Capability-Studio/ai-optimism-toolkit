/**
 * Service for aggregating Controls from multiple messages
 * Intelligently merges incremental updates and full formalizations
 */

import type { Controls, Variable, Objective, Constraint, Property } from '../components/controls/types';
import type { Message } from '../../../core/services/sessionManager';

/**
 * Aggregate Controls from session messages
 * Priority: Latest controls-generation > Latest formalization > Aggregated incremental updates
 */
export function aggregateControlsFromMessages(messages: Message[]): Controls | null {
  if (!messages || messages.length === 0) {
    return null;
  }

  // First, check for latest controls-generation (highest priority - these are complete replacements)
  const controlsGenerationMessages = messages
    .filter((m) => m.metadata?.type === 'controls-generation' && m.metadata?.structuredData)
    .sort((a, b) => b.timestamp - a.timestamp); // Most recent first

  if (controlsGenerationMessages.length > 0) {
    const latestControls = controlsGenerationMessages[0].metadata!.structuredData as Controls;
    // Validate that it has at least variables
    if (latestControls && Array.isArray(latestControls.variables) && latestControls.variables.length > 0) {
      return migrateControls(latestControls);
    }
  }

  // Second, check for latest formalization with structuredData
  const formalizationMessages = messages
    .filter((m) => m.metadata?.type === 'formalization' && m.metadata?.structuredData)
    .sort((a, b) => b.timestamp - a.timestamp); // Most recent first

  if (formalizationMessages.length > 0) {
    const latestFormalization = formalizationMessages[0].metadata!.structuredData as Controls;
    // Validate that it has at least variables
    if (latestFormalization && Array.isArray(latestFormalization.variables) && latestFormalization.variables.length > 0) {
      return migrateControls(latestFormalization);
    }
  }

  // Otherwise, aggregate from incremental updates (only if no full formalization/controls exist)
  // But exclude any incremental updates that came before the latest formalization/controls-generation
  const aggregated = aggregateIncrementalUpdates(messages);
  return aggregated ? migrateControls(aggregated) : null;
}

/**
 * Get the timestamp of the latest formalization or controls-generation message
 * This helps us know where to start aggregating incremental updates from
 */
function getLatestFormalizationTimestamp(messages: Message[]): number | null {
  const allFormalizations = [
    ...messages.filter((m) => m.metadata?.type === 'controls-generation'),
    ...messages.filter((m) => m.metadata?.type === 'formalization'),
  ];

  if (allFormalizations.length === 0) {
    return null;
  }

  // Get the most recent one
  const latest = allFormalizations.sort((a, b) => b.timestamp - a.timestamp)[0];
  return latest.timestamp;
}

/**
 * Aggregate Controls from incremental update messages
 * Merges variables, objectives, constraints, and properties intelligently
 * Only processes messages after the latest formalization/controls-generation
 */
function aggregateIncrementalUpdates(messages: Message[]): Controls | null {
  const aggregated: Partial<Controls> = {
    variables: [],
    objectives: [],
    constraints: [],
    properties: [],
  };

  // Get timestamp of latest formalization/controls-generation
  const latestFormalizationTime = getLatestFormalizationTimestamp(messages);

  // Filter to only incremental updates after the latest formalization
  // If there's no formalization, process all incremental updates
  const incrementalMessages = messages.filter((m) => {
    const updateType = m.metadata?.type;
    // Only process incremental update types
    if (!updateType || 
        updateType === 'formalization' || 
        updateType === 'controls-generation' ||
        updateType === 'optimization-run') {
      return false;
    }
    // If there's a formalization, only include updates after it
    if (latestFormalizationTime !== null) {
      return m.timestamp > latestFormalizationTime;
    }
    return true;
  });

  // Process messages in chronological order (oldest first)
  const sortedMessages = [...incrementalMessages].sort((a, b) => a.timestamp - b.timestamp);

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
      
      // For categorical variables, merge attributes at the category level
      let mergedAttributes = existingVar.attributes || {};
      if (newVar.attributes) {
        // Deep merge: merge attributes for each category
        mergedAttributes = { ...mergedAttributes };
        for (const [category, newAttrs] of Object.entries(newVar.attributes)) {
          if (typeof newAttrs === 'object' && newAttrs !== null) {
            // Merge category attributes, with new values taking precedence
            mergedAttributes[category] = {
              ...(mergedAttributes[category] || {}),
              ...newAttrs,
            };
          } else {
            // Simple value, just replace
            mergedAttributes[category] = newAttrs;
          }
        }
      }
      
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
        // Use merged attributes (preserves existing attributes when new ones are partial)
        attributes: Object.keys(mergedAttributes).length > 0 ? mergedAttributes : undefined,
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
 * Migrate controls from old format (dictionary properties) to new format (attributes on variables)
 * This converts dictionary properties like dish_attributes to variable.attributes
 */
function migrateControls(controls: Controls): Controls {
  if (!controls.properties || !controls.variables) {
    return controls;
  }

  const migratedControls = { ...controls };
  const propertiesToRemove: string[] = [];
  const updatedVariables = [...controls.variables];
  const updatedProperties = [...(controls.properties || [])];
  const updatedObjectives = [...(controls.objectives || [])];
  const updatedConstraints = [...(controls.constraints || [])];

  // Find dictionary properties that contain attributes for categorical variables
  for (const property of controls.properties) {
    try {
      // Try to parse as JSON dictionary
      const parsed = JSON.parse(property.expression);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        // Check if values are objects (attributes)
        const values = Object.values(parsed);
        if (values.length > 0 && values.every(v => typeof v === 'object' && v !== null && !Array.isArray(v))) {
          // This looks like a dictionary property containing attributes
          // Find which categorical variable it belongs to by checking expressions
          const allExpressions = [
            ...(controls.objectives?.map(obj => obj.expression) || []),
            ...(controls.constraints?.map(con => con.expression) || []),
          ];

          // Look for patterns like property_name[variable_name] in expressions
          for (const variable of controls.variables) {
            if (variable.type === 'categorical' && variable.categories) {
              const pattern = new RegExp(
                `${property.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\[\\s*${variable.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\]`,
                'g'
              );
              
              const isUsed = allExpressions.some(expr => pattern.test(expr));
              
              if (isUsed) {
                // This property contains attributes for this variable
                // Migrate attributes to variable (only if variable doesn't already have attributes)
                const variableIndex = updatedVariables.findIndex(v => v.name === variable.name);
                if (variableIndex >= 0 && !updatedVariables[variableIndex].attributes) {
                  updatedVariables[variableIndex] = {
                    ...updatedVariables[variableIndex],
                    attributes: parsed,
                  };

                  // Mark property for removal
                  propertiesToRemove.push(property.name);

                  // Update expressions to use new syntax: {variable_name}_attributes[{variable_name}]
                  const newPattern = new RegExp(
                    `${property.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\[\\s*${variable.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\]`,
                    'g'
                  );
                  const replacement = `${variable.name}_attributes[${variable.name}]`;

                  // Update objectives
                  updatedObjectives.forEach((obj, idx) => {
                    if (newPattern.test(obj.expression)) {
                      updatedObjectives[idx] = {
                        ...obj,
                        expression: obj.expression.replace(newPattern, replacement),
                      };
                    }
                  });

                  // Update constraints
                  updatedConstraints.forEach((con, idx) => {
                    if (newPattern.test(con.expression)) {
                      updatedConstraints[idx] = {
                        ...con,
                        expression: con.expression.replace(newPattern, replacement),
                      };
                    }
                  });

                  break; // Found the variable, move to next property
                }
              }
            }
          }
        }
      }
    } catch {
      // Not JSON, skip
    }
  }

  // Remove migrated properties
  const finalProperties = updatedProperties.filter(prop => !propertiesToRemove.includes(prop.name));

  return {
    ...migratedControls,
    variables: updatedVariables,
    properties: finalProperties.length > 0 ? finalProperties : undefined,
    objectives: updatedObjectives.length > 0 ? updatedObjectives : undefined,
    constraints: updatedConstraints.length > 0 ? updatedConstraints : undefined,
  };
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

