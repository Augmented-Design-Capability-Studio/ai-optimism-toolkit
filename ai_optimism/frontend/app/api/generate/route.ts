import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import {
  mergeSimpleBoundConstraints,
  isValidProperty,
  extractAttributesFromFormalization,
} from '../../../src/clients/v1/services/controlsGenerationUtils';
import {
  processCategoricalVariables,
  transformAllExpressions,
} from '../../../src/clients/v1/services/controlsPostProcessing';

export const runtime = 'edge';

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
    currentCategory: z.string().optional().describe('Currently selected category (for categorical variables only)'),
  }).passthrough()), // Use passthrough to allow attributes field without schema validation
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

    // Extract attributes from formalization JSON in description
    const attributesFromFormalization = extractAttributesFromFormalization(description);

    // NOTE: This endpoint is deprecated - controls are now generated client-side via aggregator
    // Keeping for backward compatibility but using a simplified prompt
    const generatePrompt = `Extract optimization problem details from the following description and structure them as variables, objectives, constraints, and properties:

${description}

Extract ALL information including every attribute value mentioned. Provide complete JSON structure with variables (min/max/default for continuous/discrete, categories and attributes for categorical), objectives (with expressions and weights), constraints (with expressions and types), and properties (if used in objectives/constraints).`;

    const finalModel = aiConfig.model || modelName || 'gemini-2.5-flash';
    const result = await generateObject({
      model: google(finalModel),
      schema: controlsSchema,
      prompt: generatePrompt,
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
      const variables = filteredObject.variables;
      const merged = mergeSimpleBoundConstraints(variables, filteredObject.constraints);
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

    // Get all variable names for expression transformation
    const variableNames = filteredObject.variables?.map(v => v.name) || [];
    
    // Process categorical variables - validate and preserve attributes
    if (filteredObject.variables) {
      processCategoricalVariables(filteredObject.variables, attributesFromFormalization);
      
      // Validate continuous/discrete variables
      for (const variable of filteredObject.variables) {
        if (variable.type !== 'categorical') {
          if (variable.min === undefined || variable.max === undefined || variable.default === undefined) {
            console.warn(`[Generate] Variable "${variable.name}" missing required bounds (min, max, or default)`);
          }
        }
      }
    }
    
    // Transform expressions to use correct attribute syntax
    transformAllExpressions(filteredObject, variableNames);

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
