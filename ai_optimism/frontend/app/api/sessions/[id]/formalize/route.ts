import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getFormalizationPrompt } from '../../../../../src/config/prompts';

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

    // Use centralized formalization prompt
    const formalizationPrompt = getFormalizationPrompt(conversationText);

    // Generate formalization
    const { text } = await generateText({
      model: google('gemini-2.0-flash-exp'),
      messages: [{ role: 'user', content: formalizationPrompt }],
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
