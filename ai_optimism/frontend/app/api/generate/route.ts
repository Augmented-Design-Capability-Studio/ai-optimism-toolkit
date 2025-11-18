import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export const runtime = 'edge';

// Schema for optimization problem controls
const controlsSchema = z.object({
  variables: z.array(z.object({
    name: z.string().describe('Variable name (e.g., "temperature", "speed")'),
    type: z.enum(['continuous', 'discrete']).describe('Type of variable'),
    min: z.number().describe('Minimum value'),
    max: z.number().describe('Maximum value'),
    default: z.number().describe('Default/initial value'),
    unit: z.string().optional().describe('Unit of measurement (e.g., "°C", "rpm")'),
    description: z.string().describe('Brief description of what this variable represents'),
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
    const { description } = await req.json();
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
      model: google('gemini-2.0-flash'),
      schema: controlsSchema,
      prompt: `Extract optimization problem details from the following description and structure them:

Description: ${description}

Identify:
1. Variables that can be changed/optimized (with reasonable min/max ranges and default values)
2. Objectives to optimize for (what to minimize or maximize, with Python expressions)
3. Properties that can be calculated from variables (with Python expressions)
4. Constraints that must be satisfied (as Python expressions)

Be specific and practical. Use clear variable names and valid Python expressions.`,
    });

    return Response.json(result.object);
  } catch (error) {
    console.error('Generate error:', error);
    return new Response('Error generating controls', { status: 500 });
  }
}
