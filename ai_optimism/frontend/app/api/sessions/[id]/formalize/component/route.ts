import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getComponentGenerationPrompt } from '@/core/config/prompts';
import { extractJSONBlocks } from '@/core/components/shared/chat/messages/utils/jsonExtractors';
import { aggregateControlsFromMessages } from '@/clients/v1/services/controlsAggregator';
import type { Controls } from '@/clients/v1/components/controls/controls/types';
import type { Message } from '@/core/services/sessionManager';
import { formatMessagesAsConversation } from '@/core/utils/messageFiltering';

export const runtime = 'edge';

type ComponentType = 'variables' | 'properties' | 'objectives' | 'constraints';

/**
 * Validate dependencies for component generation
 */
function validateDependencies(
  component: ComponentType,
  existingComponents: Controls | null
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Variables can be generated standalone
  if (component === 'variables') {
    if (existingComponents?.variables && existingComponents.variables.length > 0) {
      warnings.push('Variables already exist in conversation. New variables will be added.');
    }
    return { valid: true, errors, warnings };
  }

  // Properties, objectives, and constraints require variables
  if (component === 'properties' || component === 'objectives' || component === 'constraints') {
    if (!existingComponents?.variables || existingComponents.variables.length === 0) {
      errors.push(
        `Cannot generate ${component}: variables are required but none found in conversation. Please generate variables first.`
      );
      return { valid: false, errors, warnings };
    }
  }

  // Check for existing components
  if (component === 'objectives' && existingComponents?.objectives && existingComponents.objectives.length > 0) {
    warnings.push('Objectives already exist in conversation. New objectives will be added.');
  }
  if (component === 'constraints' && existingComponents?.constraints && existingComponents.constraints.length > 0) {
    warnings.push('Constraints already exist in conversation. New constraints will be added.');
  }
  if (component === 'properties' && existingComponents?.properties && existingComponents.properties.length > 0) {
    warnings.push('Properties already exist in conversation. New properties will be added.');
  }

  return { valid: true, errors, warnings };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { component, model: modelName, messages: providedMessages } = await request.json();

    // Validate component type
    if (!component || !['variables', 'properties', 'objectives', 'constraints'].includes(component)) {
      return NextResponse.json(
        { error: 'Invalid component type. Must be one of: variables, properties, objectives, constraints' },
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
      console.log('[Component Generation API] Fetching AI config from:', configUrl);
      
      const configResponse = await fetch(configUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (configResponse.status === 404) {
        return NextResponse.json(
          { error: 'AI provider not configured for this session' },
          { status: 400 }
        );
      }

      if (!configResponse.ok) {
        const errorText = await configResponse.text();
        console.error('[Component Generation API] Config response error:', errorText);
        throw new Error(`Failed to fetch AI config: ${configResponse.status} ${configResponse.statusText}`);
      }

      aiConfig = await configResponse.json();
      console.log('[Component Generation API] Successfully fetched AI config');
    } catch (error: any) {
      console.error('[Component Generation API] Error fetching AI config:', {
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

    // Use provided messages (already filtered by frontend) or fetch from backend
    let sessionMessages: Message[] = [];
    
    if (providedMessages && Array.isArray(providedMessages) && providedMessages.length > 0) {
      // Use provided messages (already filtered by frontend)
      sessionMessages = providedMessages;
    } else {
      // Fallback: fetch from backend (for backward compatibility)
      try {
        const messagesResponse = await fetch(`${baseUrl}/sessions/${sessionId}/messages`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!messagesResponse.ok) {
          return NextResponse.json(
            { error: 'Failed to fetch session messages' },
            { status: messagesResponse.status }
          );
        }

        sessionMessages = await messagesResponse.json();
      } catch (error: any) {
        console.error('[Component Generation API] Error fetching messages:', error);
        return NextResponse.json(
          { error: 'Failed to fetch session messages' },
          { status: 500 }
        );
      }
    }

    // Format conversation for analysis
    const conversationText = formatMessagesAsConversation(sessionMessages);

    // Aggregate existing components from messages
    const formattedMessages = sessionMessages.map((m) => ({
      id: m.id || '',
      sessionId: sessionId,
      sender: m.sender,
      content: m.content,
      timestamp: m.timestamp || Date.now(),
      metadata: m.metadata || {},
    }));

    const existingComponents = aggregateControlsFromMessages(formattedMessages);

    // Validate dependencies
    const validation = validateDependencies(component as ComponentType, existingComponents);
    
    if (!validation.valid) {
      return NextResponse.json({
        summary: `Cannot generate ${component}: ${validation.errors.join(' ')}`,
        component,
        data: null,
        validation: {
          errors: validation.errors,
          warnings: validation.warnings,
        },
      });
    }

    // Create Google provider with API key from backend
    const google = createGoogleGenerativeAI({
      apiKey: aiConfig.apiKey,
    });

    // Build existing components context for prompt
    const existingContext = existingComponents ? {
      variables: existingComponents.variables as unknown as Array<Record<string, unknown>> | undefined,
      objectives: existingComponents.objectives as unknown as Array<Record<string, unknown>> | undefined,
      constraints: existingComponents.constraints as unknown as Array<Record<string, unknown>> | undefined,
      properties: existingComponents.properties as unknown as Array<Record<string, unknown>> | undefined,
    } : null;

    // Generate component using AI
    const finalModel = aiConfig.model || modelName || 'gemini-2.5-flash';
    const prompt = getComponentGenerationPrompt(
      component as ComponentType,
      conversationText,
      existingContext
    );

    const { text } = await generateText({
      model: google(finalModel),
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3, // Lower temperature for more structured output
    });

    // Extract JSON from response
    let componentData = null;
    let summary = text;

    // Look for JSON block in response
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
      const jsonObjectMatch = text.match(/(\{[\s\S]*"[^"]+"[\s\S]*\})/);
      if (jsonObjectMatch) {
        try {
          JSON.parse(jsonObjectMatch[1].trim());
          jsonMatch = jsonObjectMatch;
        } catch {
          // Not valid JSON
        }
      }
    }

    if (jsonMatch) {
      try {
        const jsonText = jsonMatch[1].trim();
        const parsed = JSON.parse(jsonText);
        
        // Extract the component data
        if (parsed[component] && Array.isArray(parsed[component])) {
          componentData = { [component]: parsed[component] };
        } else {
          // If the JSON has the component at root level
          componentData = parsed;
        }
        
        // Extract summary (everything before the JSON)
        const jsonStartIndex = text.indexOf(jsonMatch[0]);
        summary = text.substring(0, jsonStartIndex).trim();
        
        console.log(`[Component Generation API] Successfully extracted ${component} from response`);
      } catch (e) {
        console.error(`[Component Generation API] Failed to parse JSON block:`, e);
        console.error(`[Component Generation API] JSON text preview:`, jsonMatch[1].substring(0, 200));
      }
    }

    // If no JSON found, try to parse the entire response as JSON
    if (!componentData) {
      try {
        const parsed = JSON.parse(text.trim());
        if (parsed[component] && Array.isArray(parsed[component])) {
          componentData = { [component]: parsed[component] };
          summary = `Generated ${component} for the optimization problem`;
        }
      } catch (e) {
        console.warn(`[Component Generation API] No structured data extracted from response`);
        console.warn(`[Component Generation API] Response preview:`, text.substring(0, 500));
      }
    }

    // Validate that component data was extracted
    if (!componentData || !componentData[component] || !Array.isArray(componentData[component]) || componentData[component].length === 0) {
      return NextResponse.json({
        summary: summary || `Failed to generate ${component}. The AI response did not contain valid ${component} data.`,
        component,
        data: null,
        validation: {
          errors: [`Failed to extract valid ${component} from AI response`],
          warnings: validation.warnings,
        },
      });
    }

    return NextResponse.json({
      summary: summary || `Generated ${component} for the optimization problem`,
      component,
      data: componentData,
      validation: {
        errors: [],
        warnings: validation.warnings,
      },
    });
  } catch (error) {
    console.error('[Component Generation API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate component',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

