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
  objectives: z.array(z.object({
    name: z.string().describe('Objective name (e.g., "Minimize Cost", "Maximize Efficiency")'),
    expression: z.string().describe('Python expression to calculate this objective'),
    goal: z.enum(['minimize', 'maximize']).describe('Whether to minimize or maximize this objective'),
    description: z.string().describe('What this objective represents'),
  })).optional(),
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

    return Response.json(result.object);
  } catch (error) {
    console.error('Generate error:', error);
    return new Response('Error generating controls', { status: 500 });
  }
}
