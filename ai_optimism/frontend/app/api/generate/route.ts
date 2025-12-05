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
    attributes: z.record(z.record(z.any())).optional().describe('Attributes for categorical variables: mapping each category to its data (e.g., {"category1": {"cost": 10, "time": 5}, "category2": {"cost": 20, "time": 10}})'),
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

    // Filter out unused properties (those not referenced in objectives or constraints)
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

      // Keep only used properties
      filteredObject.properties = filteredObject.properties.filter(prop =>
        usedProperties.has(prop.name)
      );
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

    // Validate that categorical variables with attributes have them properly set
    if (filteredObject.variables) {
      for (const variable of filteredObject.variables) {
        if (variable.type === 'categorical' && variable.categories && variable.categories.length > 0) {
          // Check if attributes are missing but might be needed (based on objective expressions)
          if (!variable.attributes) {
            const allExpressions = [
              ...(filteredObject.objectives?.map(obj => obj.expression) || []),
              ...(filteredObject.constraints?.map(con => con.expression) || []),
            ];
            // Check if any expression references this variable's attributes
            const attrPattern = new RegExp(`${variable.name}_attributes\\[${variable.name}\\]`, 'g');
            const needsAttributes = allExpressions.some(expr => attrPattern.test(expr));
            if (needsAttributes) {
              console.warn(`[Generate] Variable "${variable.name}" is referenced with attributes but has none defined.`);
            }
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
