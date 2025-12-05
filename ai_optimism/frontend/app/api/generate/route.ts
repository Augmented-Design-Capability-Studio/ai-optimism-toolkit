import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getGenerateControlsPrompt } from '../../../src/config/prompts';

export const runtime = 'edge';

/**
 * Merge simple bound constraints into variable min/max values
 * Returns updated variables and filtered constraints
 * Preserves all properties from input variables and constraints
 */
function mergeSimpleBoundConstraints<
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
 * Validate that a property is not a static data structure (dictionary/list)
 * Properties should be computed expressions, not data storage
 */
function isValidProperty(property: { name: string; expression: string }): boolean {
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

// Schema for optimization problem controls
const controlsSchema = z.object({
  variables: z.array(z.object({
    name: z.string().describe('Variable name (e.g., "temperature", "speed", "material_type")'),
    type: z.enum(['continuous', 'discrete', 'categorical']).describe('Type of variable: continuous (real numbers), discrete (integers), or categorical (named options)'),
    min: z.number().optional().describe('Minimum value (for continuous/discrete only)'),
    max: z.number().optional().describe('Maximum value (for continuous/discrete only)'),
    default: z.number().optional().describe('Default/initial value (for continuous/discrete only)'),
    unit: z.string().optional().describe('Unit of measurement (e.g., "°C", "rpm")'),
    description: z.string().describe('Brief description of what this variable represents'),
    categories: z.array(z.string()).optional().describe('List of category names (for categorical variables only, e.g., ["red", "blue", "green"])'),
    attributes: z.record(z.string(), z.record(z.string(), z.any())).optional().describe('Attributes for categorical variables: mapping each category to its data (e.g., {"category1": {"cost": 10, "time": 5}, "category2": {"cost": 20, "time": 10}})'),
    currentCategory: z.string().optional().describe('Currently selected category (for categorical variables only)'),
  })),
  // Require at least one objective; generation should fail fast if none are provided
  objectives: z.array(z.object({
    name: z.string().describe('Objective name (e.g., "Minimize Cost", "Maximize Efficiency")'),
    expression: z.string().describe('Python expression to calculate this objective'),
    goal: z.enum(['minimize', 'maximize']).describe('Whether to minimize or maximize this objective'),
    description: z.string().describe('What this objective represents'),
  })).min(1, { message: 'At least one objective is required' }),
  properties: z.array(z.object({
    name: z.string().describe('Property name'),
    expression: z.string().describe('Python expression to calculate this property'),
    description: z.string().optional().describe('What this property represents (optional - omit for dictionary properties mapping categorical choices to their attributes. Note: "Attributes" are properties of categorical choices, distinct from "Properties" which are derived/computed values)'),
  })).optional(),
  constraints: z.array(z.object({
    expression: z.string().describe('Python expression for constraint (e.g., "x + y <= 100")'),
    description: z.string().describe('What this constraint ensures'),
    title: z.string().describe('Short title for display in visualizations (REQUIRED, 3-5 words max, e.g., "Total Budget Limit", "Staff Ratio")'),
  })).optional(),
});

export async function POST(req: Request) {
  try {
    const { description, model: modelName, sessionId } = await req.json();

    if (!description) {
      return Response.json({ error: 'Description required' }, { status: 400 });
    }

    if (!sessionId) {
      return Response.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Get backend URL from environment variable
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const baseUrl = `${backendUrl}/api`;

    // Fetch AI config (including decrypted API key) from backend
    let aiConfig;
    try {
      const configResponse = await fetch(`${baseUrl}/sessions/${sessionId}/ai-config/key`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (configResponse.status === 404) {
        return Response.json(
          { error: 'AI provider not configured for this session' },
          { status: 400 }
        );
      }

      if (!configResponse.ok) {
        throw new Error(`Failed to fetch AI config: ${configResponse.statusText}`);
      }

      aiConfig = await configResponse.json();
    } catch (error: any) {
      console.error('[Generate API] Error fetching AI config:', error);
      const errorMessage = error.message || 'Unknown error';
      const isNetworkError = errorMessage.includes('fetch') || 
                            errorMessage.includes('ECONNREFUSED') || 
                            errorMessage.includes('network') ||
                            errorMessage.includes('Failed to fetch');
      
      return Response.json(
        { 
          error: isNetworkError 
            ? 'Cannot connect to backend server' 
            : 'Failed to fetch AI configuration',
          details: `Backend URL: ${backendUrl}. Error: ${errorMessage}`
        },
        { status: 500 }
      );
    }

    if (!aiConfig || !aiConfig.apiKey) {
      return Response.json(
        { error: 'AI provider not configured for this session' },
        { status: 400 }
      );
    }

    // Create Google provider with API key from backend
    const google = createGoogleGenerativeAI({
      apiKey: aiConfig.apiKey,
    });

    const finalModel = aiConfig.model || modelName || 'gemini-2.5-flash';
    const result = await generateObject({
      model: google(finalModel),
      schema: controlsSchema,
      prompt: getGenerateControlsPrompt(description),
    });

    // Filter out unused properties and invalid properties (dictionaries/lists that should be attributes)
    const filteredObject = { ...result.object };
    if (filteredObject.properties && filteredObject.properties.length > 0) {
      const usedProperties = new Set<string>();

      // Check objectives for property usage
      filteredObject.objectives?.forEach(obj => {
        filteredObject.properties?.forEach(prop => {
          if (obj.expression.includes(prop.name)) {
            usedProperties.add(prop.name);
          }
        });
      });

      // Check constraints for property usage
      filteredObject.constraints?.forEach(con => {
        filteredObject.properties?.forEach(prop => {
          if (con.expression.includes(prop.name)) {
            usedProperties.add(prop.name);
          }
        });
      });

      // Filter: keep only used properties that are valid (not static data structures)
      const validProperties = filteredObject.properties.filter(prop => {
        if (!usedProperties.has(prop.name)) {
          return false; // Not used
        }
        if (!isValidProperty(prop)) {
          console.warn(`[Generate] Property "${prop.name}" appears to be static data - should be in variable attributes`);
          return false; // Invalid - static data structure
        }
        return true;
      });

      filteredObject.properties = validProperties.length > 0 ? validProperties : undefined;
    }

    // Merge simple bound constraints into variable min/max values
    if (filteredObject.constraints && filteredObject.constraints.length > 0 && filteredObject.variables) {
      // Create a typed reference to preserve the exact variable type
      const variables = filteredObject.variables;
      const merged = mergeSimpleBoundConstraints(variables, filteredObject.constraints);
      // Type assertion: spread operator preserves all properties including required ones
      filteredObject.variables = merged.variables as typeof variables;
      filteredObject.constraints = merged.constraints.length > 0 ? merged.constraints : undefined;
    }

    // Final validation: ensure variables exist
    if (!filteredObject.variables || filteredObject.variables.length === 0) {
      console.error('[Generate] No variables generated');
      return Response.json(
        { error: 'Generated controls missing variables' },
        { status: 500 }
      );
    }

    // Ensure objectives were produced by the model; fail clearly if not
    if (!filteredObject.objectives || filteredObject.objectives.length === 0) {
      console.error('Generate result missing objectives:', filteredObject);
      return Response.json(
        { error: 'Generated controls missing objectives' },
        { status: 500 }
      );
    }

    // Validate that objectives don't define dictionaries (attributes should be in variables)
    for (const objective of filteredObject.objectives) {
      const expr = objective.expression;
      // Check for dictionary assignments like "dict = {...}" or "meta_data_dict = {...}"
      if (/\w+\s*=\s*\{/.test(expr)) {
        console.warn(`[Generate] Objective "${objective.name}" contains dictionary assignment. Attributes should be in variable "attributes" field.`);
      }
    }

    // Validate categorical variables have complete attributes
    if (filteredObject.variables) {
      for (const variable of filteredObject.variables) {
        if (variable.type === 'categorical') {
          // Check if categories are defined
          if (!variable.categories || variable.categories.length === 0) {
            console.warn(`[Generate] Categorical variable "${variable.name}" missing categories array`);
          } else {
            // Check if attributes are defined
            if (!variable.attributes || Object.keys(variable.attributes).length === 0) {
              console.warn(`[Generate] Categorical variable "${variable.name}" missing attributes object`);
            } else {
              // Check that all categories have attributes
              const missingCategories = variable.categories.filter(
                cat => !variable.attributes || !variable.attributes[cat]
              );
              if (missingCategories.length > 0) {
                console.warn(`[Generate] Variable "${variable.name}" missing attributes for categories: ${missingCategories.join(', ')}`);
              }
            }
          }
          
          // Check if attributes are referenced but missing
          const allExpressions = [
            ...(filteredObject.objectives?.map(obj => obj.expression) || []),
            ...(filteredObject.constraints?.map(con => con.expression) || []),
          ];
          const attrPattern = new RegExp(`${variable.name}_attributes\\[${variable.name}\\]`, 'g');
          const needsAttributes = allExpressions.some(expr => attrPattern.test(expr));
          if (needsAttributes && (!variable.attributes || Object.keys(variable.attributes).length === 0)) {
            console.warn(`[Generate] Variable "${variable.name}" is referenced with attributes but has none defined.`);
          }
        } else {
          // For continuous/discrete, check that min/max/default are provided
          if (variable.min === undefined || variable.max === undefined || variable.default === undefined) {
            console.warn(`[Generate] Variable "${variable.name}" missing required bounds (min, max, or default)`);
          }
        }
      }
    }

    return Response.json(filteredObject);
  } catch (error) {
    console.error('Generate error:', error);
    return Response.json(
      {
        error: 'Error generating controls',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
