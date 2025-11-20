import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getGenerateControlsPrompt } from '../../../src/config/prompts';

export const runtime = 'edge';

// Schema for optimization problem controls
const controlsSchema = z.object({
  variables: z.array(z.object({
    name: z.string().describe('Variable name (e.g., "temperature", "speed", "material_type")'),
    type: z.enum(['continuous', 'discrete', 'categorical']).describe('Type of variable: continuous (real numbers), discrete (integers), or categorical (named options)'),
    min: z.number().describe('Minimum value (for continuous/discrete only)'),
    max: z.number().describe('Maximum value (for continuous/discrete only)'),
    default: z.number().describe('Default/initial value (for continuous/discrete only)'),
    unit: z.string().optional().describe('Unit of measurement (e.g., "°C", "rpm")'),
    description: z.string().describe('Brief description of what this variable represents'),
    categories: z.array(z.string()).optional().describe('List of category names (for categorical variables only, e.g., ["red", "blue", "green"])'),
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
    description: z.string().describe('What this property represents'),
  })).optional(),
  constraints: z.array(z.object({
    expression: z.string().describe('Python expression for constraint (e.g., "x + y <= 100")'),
    description: z.string().describe('What this constraint ensures'),
  })).optional(),
});

export async function POST(req: Request) {
  try {
    const { description, model: modelName } = await req.json();
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      return new Response('API key required', { status: 400 });
    }

    if (!description) {
      return new Response('Description required', { status: 400 });
    }

    // Create Google provider with API key
    const google = createGoogleGenerativeAI({
      apiKey,
    });

    const result = await generateObject({
      model: google(modelName || 'gemini-2.0-flash'),
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

    // Ensure objectives were produced by the model; fail clearly if not
    if (!filteredObject.objectives || filteredObject.objectives.length === 0) {
      console.error('Generate result missing objectives:', filteredObject);
      return new Response('Generated controls missing objectives', { status: 500 });
    }

    return Response.json(filteredObject);
  } catch (error) {
    console.error('Generate error:', error);
    return new Response('Error generating controls', { status: 500 });
  }
}
