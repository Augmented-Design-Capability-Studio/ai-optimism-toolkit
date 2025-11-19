import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

// System prompt for problem formalization
const FORMALIZATION_PROMPT = `You are an expert in optimization problem formalization. 

Given a conversation between a user and a researcher about an optimization problem, analyze the conversation and extract:

1. **Variables**: What can be adjusted or changed? (Include name, type, and bounds)
2. **Properties**: Derived or computed values based on variables
3. **Objectives**: What should be optimized? (minimize or maximize)
4. **Constraints**: What restrictions or requirements must be satisfied?

Return your analysis in two parts:

1. A natural language summary explaining the problem setup
2. A structured JSON object matching this schema:

\`\`\`json
{
  "variables": [
    {
      "name": "variable_name",
      "type": "continuous" | "categorical",
      "bounds": [min, max] (for continuous) or ["option1", "option2", ...] (for categorical),
      "description": "What this variable represents"
    }
  ],
  "properties": [
    {
      "name": "property_name",
      "expression": "formula or relationship",
      "description": "What this property computes"
    }
  ],
  "objectives": [
    {
      "name": "objective_name",
      "type": "minimize" | "maximize",
      "expression": "formula to optimize",
      "description": "What is being optimized"
    }
  ],
  "constraints": [
    {
      "expression": "constraint formula",
      "description": "What this constraint enforces"
    }
  ]
}
\`\`\`

Be thorough but concise. Focus on extracting concrete, actionable elements from the conversation.`;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // For now, use environment variable for API key (researcher's key)
    // In production, you'd use a secure backend API key
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI provider not configured on server' },
        { status: 500 }
      );
    }

    // Format conversation for analysis
    const conversationText = messages
      .map((m: any) => {
        const role = m.sender === 'user' ? 'User' : m.sender === 'researcher' ? 'Researcher' : 'AI';
        return `${role}: ${m.content}`;
      })
      .join('\n\n');

    // Initialize Google AI
    const google = createGoogleGenerativeAI({
      apiKey,
    });

    // Generate formalization
    const { text } = await generateText({
      model: google('gemini-2.0-flash-exp'),
      system: FORMALIZATION_PROMPT,
      prompt: `Analyze this conversation and formalize the optimization problem:

${conversationText}

Provide:
1. A clear natural language summary of the problem setup
2. The structured JSON with variables, properties, objectives, and constraints`,
      temperature: 0.3, // Lower temperature for more structured output
    });

    // Try to extract JSON from the response
    let structuredData = null;
    let summary = text;

    // Look for JSON block in response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        structuredData = JSON.parse(jsonMatch[1]);
        // Extract summary (everything before the JSON)
        summary = text.substring(0, text.indexOf('```json')).trim();
      } catch (e) {
        console.error('[Formalize] Failed to parse JSON:', e);
      }
    }

    // If no JSON found, try to parse the entire response
    if (!structuredData) {
      try {
        structuredData = JSON.parse(text);
        summary = 'Problem formalized from conversation';
      } catch (e) {
        // No structured data available, use full text as summary
        console.warn('[Formalize] No structured data extracted');
      }
    }

    return NextResponse.json({
      summary: summary || 'Problem formalized from conversation',
      controls: structuredData,
      sessionId,
    });
  } catch (error) {
    console.error('[Formalize API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to formalize problem',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
