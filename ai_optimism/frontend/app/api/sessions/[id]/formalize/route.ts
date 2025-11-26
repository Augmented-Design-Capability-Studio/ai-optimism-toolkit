import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getFormalizationPrompt } from '../../../../../src/config/prompts';

export const runtime = 'edge';

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

    // Get backend URL from environment variable
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const baseUrl = `${backendUrl}/api`;

    // Fetch AI config (including decrypted API key) from backend
    let aiConfig;
    try {
      const configUrl = `${baseUrl}/sessions/${sessionId}/ai-config/key`;
      console.log('[Formalize API] Fetching AI config from:', configUrl);
      
      const configResponse = await fetch(configUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('[Formalize API] Config response status:', configResponse.status);

      if (configResponse.status === 404) {
        return NextResponse.json(
          { error: 'AI provider not configured for this session' },
          { status: 400 }
        );
      }

      if (!configResponse.ok) {
        const errorText = await configResponse.text();
        console.error('[Formalize API] Config response error:', errorText);
        throw new Error(`Failed to fetch AI config: ${configResponse.status} ${configResponse.statusText}`);
      }

      aiConfig = await configResponse.json();
      console.log('[Formalize API] Successfully fetched AI config');
    } catch (error: any) {
      console.error('[Formalize API] Error fetching AI config:', {
        error,
        message: error.message,
        stack: error.stack,
        backendUrl,
        baseUrl,
        sessionId,
      });
      const errorMessage = error.message || String(error) || 'Unknown error';
      const isNetworkError = errorMessage.includes('fetch') || 
                            errorMessage.includes('ECONNREFUSED') || 
                            errorMessage.includes('network') ||
                            errorMessage.includes('Failed to fetch') ||
                            errorMessage.includes('ECONNRESET') ||
                            errorMessage.includes('ENOTFOUND');
      
      return NextResponse.json(
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
      return NextResponse.json(
        { error: 'AI provider not configured for this session' },
        { status: 400 }
      );
    }

    // Format conversation for analysis
    const conversationText = messages
      .map((m: any) => {
        const role = m.sender === 'user' ? 'User' : m.sender === 'researcher' ? 'Researcher' : 'AI';
        return `${role}: ${m.content}`;
      })
      .join('\n\n');

    // Initialize Google AI with API key from backend
    const google = createGoogleGenerativeAI({
      apiKey: aiConfig.apiKey,
    });

    // Use centralized formalization prompt
    const formalizationPrompt = getFormalizationPrompt(conversationText);

    // Generate formalization
    const modelName = aiConfig.model || 'gemini-2.5-flash';
    const { text } = await generateText({
      model: google(modelName),
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
