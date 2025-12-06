import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getFormalizationPrompt } from '../../../../../src/clients/v1/config/prompts';
import { extractJSONBlocks } from '../../../../../src/core/components/shared/chat/messages/utils/jsonExtractors';
import { aggregateControlsFromMessages } from '../../../../../src/clients/v1/services/controlsAggregator';

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

    // Extract JSON structures from messages
    // Convert messages to the format expected by aggregateControlsFromMessages
    const formattedMessages = messages.map((m: any) => ({
      id: m.id || '',
      sessionId: sessionId,
      sender: m.sender,
      content: m.content,
      timestamp: m.timestamp || Date.now(),
      metadata: m.metadata || {},
    }));

    // Try to aggregate controls from messages (handles both metadata.structuredData and JSON blocks)
    let jsonStructures: {
      variables?: Array<Record<string, unknown>>;
      objectives?: Array<Record<string, unknown>>;
      constraints?: Array<Record<string, unknown>>;
      properties?: Array<Record<string, unknown>>;
    } | null = null;

    try {
      const aggregatedControls = aggregateControlsFromMessages(formattedMessages);
      
      if (aggregatedControls) {
        jsonStructures = {
          variables: aggregatedControls.variables as unknown as Array<Record<string, unknown>> | undefined,
          objectives: aggregatedControls.objectives as unknown as Array<Record<string, unknown>> | undefined,
          constraints: aggregatedControls.constraints as unknown as Array<Record<string, unknown>> | undefined,
          properties: aggregatedControls.properties as unknown as Array<Record<string, unknown>> | undefined,
        };
      } else {
        // Fallback: Try to extract JSON blocks directly from AI/researcher message content
        const jsonBlocks: Array<{ json: string }> = [];
        for (const msg of messages) {
          if (msg.sender === 'ai' || msg.sender === 'researcher') {
            const blocks = extractJSONBlocks(msg.content || '');
            jsonBlocks.push(...blocks);
          }
        }

        // If we found JSON blocks, try to parse and aggregate them
        if (jsonBlocks.length > 0) {
          const parsedStructures: {
            variables?: Array<Record<string, unknown>>;
            objectives?: Array<Record<string, unknown>>;
            constraints?: Array<Record<string, unknown>>;
            properties?: Array<Record<string, unknown>>;
          } = {};

          for (const block of jsonBlocks) {
            try {
              const parsed = JSON.parse(block.json);
              if (parsed.variables && Array.isArray(parsed.variables)) {
                parsedStructures.variables = [
                  ...(parsedStructures.variables || []),
                  ...parsed.variables,
                ];
              }
              if (parsed.objectives && Array.isArray(parsed.objectives)) {
                parsedStructures.objectives = [
                  ...(parsedStructures.objectives || []),
                  ...parsed.objectives,
                ];
              }
              if (parsed.constraints && Array.isArray(parsed.constraints)) {
                parsedStructures.constraints = [
                  ...(parsedStructures.constraints || []),
                  ...parsed.constraints,
                ];
              }
              if (parsed.properties && Array.isArray(parsed.properties)) {
                parsedStructures.properties = [
                  ...(parsedStructures.properties || []),
                  ...parsed.properties,
                ];
              }
            } catch (e) {
              // Skip invalid JSON blocks
              console.warn('[Formalize API] Failed to parse JSON block:', e);
            }
          }

          // Only use parsed structures if we found at least one valid structure
          if (
            parsedStructures.variables?.length ||
            parsedStructures.objectives?.length ||
            parsedStructures.constraints?.length ||
            parsedStructures.properties?.length
          ) {
            jsonStructures = parsedStructures;
          }
        }
      }
    } catch (error) {
      // If JSON extraction fails, continue without JSON structures (will use conversation-only mode)
      console.warn('[Formalize API] Error extracting JSON structures, continuing with conversation-only mode:', error);
    }

    // Initialize Google AI with API key from backend
    const google = createGoogleGenerativeAI({
      apiKey: aiConfig.apiKey,
    });

    // Use centralized formalization prompt with JSON structures if available
    const formalizationPrompt = getFormalizationPrompt(conversationText, jsonStructures);

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

    // Look for JSON block in response (multiple patterns)
    // Pattern 1: ```json ... ```
    let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    
    // Pattern 2: ``` ... ``` (might be JSON without json label)
    if (!jsonMatch) {
      const codeBlockMatch = text.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        try {
          // Try to parse as JSON
          JSON.parse(codeBlockMatch[1].trim());
          jsonMatch = codeBlockMatch;
        } catch {
          // Not JSON, ignore
        }
      }
    }
    
    // Pattern 3: Look for JSON object at the end of the text
    if (!jsonMatch) {
      // Try to find a JSON object pattern { ... } at the end
      // Use a capture group so [1] contains the JSON content
      const jsonObjectMatch = text.match(/(\{[\s\S]*"variables"[\s\S]*\})/);
      if (jsonObjectMatch) {
        jsonMatch = jsonObjectMatch;
      }
    }

    if (jsonMatch) {
      try {
        const jsonText = jsonMatch[1].trim();
        structuredData = JSON.parse(jsonText);
        // Extract summary (everything before the JSON)
        const jsonStartIndex = text.indexOf(jsonMatch[0]);
        summary = text.substring(0, jsonStartIndex).trim();
        console.log('[Formalize API] Successfully extracted JSON from response');
      } catch (e) {
        console.error('[Formalize API] Failed to parse JSON block:', e);
        console.error('[Formalize API] JSON text:', jsonMatch[1].substring(0, 200));
      }
    }

    // If no JSON found, try to parse the entire response as JSON
    if (!structuredData) {
      try {
        structuredData = JSON.parse(text.trim());
        summary = 'Problem formalized from conversation';
        console.log('[Formalize API] Parsed entire response as JSON');
      } catch (e) {
        // No structured data available, use full text as summary
        console.warn('[Formalize API] No structured data extracted from response');
        console.warn('[Formalize API] Response preview:', text.substring(0, 500));
      }
    }

    // Validate that structuredData has required fields
    if (structuredData && (!structuredData.variables || !Array.isArray(structuredData.variables) || structuredData.variables.length === 0)) {
      console.warn('[Formalize API] Extracted JSON missing required variables array');
      structuredData = null;
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
