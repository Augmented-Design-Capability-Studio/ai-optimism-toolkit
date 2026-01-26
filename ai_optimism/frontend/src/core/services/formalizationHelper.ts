/**
 * Shared formalization logic for both chat and researcher modes
 */

import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { Message } from './sessionManager';
import { getFormalizationPromptByVersion, isIncompleteFormalization } from '@/clients/prompts';
import { extractJSONBlocks } from '../components/shared/chat/messages/utils/jsonExtractors';
import { aggregateControlsFromMessages } from './controlsAggregator';

export interface FormalizationConfig {
  sessionId: string;
  apiKey: string;
  model: string;
  messages: Message[];
  sessionManager: any; // Will be typed properly
  sessionVersion?: string | null;
}

/**
 * Execute formalization and add result to session
 * Returns true if successful, false otherwise
 */
export async function executeFormalization(config: FormalizationConfig): Promise<boolean> {
  const { sessionId, apiKey, model, messages, sessionVersion } = config;

  try {
    // Build conversation context with proper role labels
    const conversationContext = messages
      .map(msg => {
        let role = 'Assistant';
        if (msg.sender === 'user') {
          role = 'User';
        } else if (msg.sender === 'researcher') {
          role = 'Researcher';
        } else if (msg.sender === 'ai') {
          role = 'AI';
        }
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');

    // Extract JSON structures from messages
    // First, try to aggregate from incremental updates (which may have structuredData in metadata)
    let jsonStructures: {
      variables?: Array<Record<string, unknown>>;
      objectives?: Array<Record<string, unknown>>;
      constraints?: Array<Record<string, unknown>>;
      properties?: Array<Record<string, unknown>>;
    } | null = null;

    // Check for aggregated controls from messages (handles both metadata.structuredData and JSON blocks)
    const aggregatedControls = aggregateControlsFromMessages(messages);
    
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
          const blocks = extractJSONBlocks(msg.content);
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
            console.warn('[Formalization Helper] Failed to parse JSON block:', e);
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

    const formalizationPrompt = getFormalizationPromptByVersion(
      sessionVersion || null,
      conversationContext,
      jsonStructures
    );

    // Initialize Google AI
    const google = createGoogleGenerativeAI({ apiKey });
    const aiModel = google(model || 'gemini-2.5-flash-lite');

    // Stream formalization
    const result = await streamText({
      model: aiModel,
      messages: [{ role: 'user', content: formalizationPrompt }],
    });

    // Collect full text
    let formalizedText = '';
    for await (const textPart of result.textStream) {
      formalizedText += textPart;
    }

    if (!formalizedText?.trim()) {
      throw new Error('Empty formalization response');
    }

    // Check if formalization was incomplete
    const incomplete = isIncompleteFormalization(formalizedText);

    if (incomplete) {
      // Add incomplete formalization message
      config.sessionManager.addMessage(sessionId, 'ai', formalizedText, {
        type: 'formalization',
        incomplete: true,
      });
      return false;
    }

    // Extract JSON from the response (same logic as API route)
    let structuredData = null;
    let summary = formalizedText;

    // Look for JSON block in response
    let jsonMatch = formalizedText.match(/```json\s*([\s\S]*?)\s*```/);
    
    if (!jsonMatch) {
      const codeBlockMatch = formalizedText.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        try {
          JSON.parse(codeBlockMatch[1].trim());
          jsonMatch = codeBlockMatch;
        } catch {
          // Not JSON, ignore
        }
      }
    }
    
    if (!jsonMatch) {
      const jsonObjectMatch = formalizedText.match(/(\{[\s\S]*"variables"[\s\S]*\})/);
      if (jsonObjectMatch) {
        jsonMatch = jsonObjectMatch;
      }
    }

    if (jsonMatch) {
      try {
        const jsonText = jsonMatch[1].trim();
        structuredData = JSON.parse(jsonText);
        const jsonStartIndex = formalizedText.indexOf(jsonMatch[0]);
        summary = formalizedText.substring(0, jsonStartIndex).trim();
        console.log('[Formalization Helper] Successfully extracted JSON from response');
      } catch (e) {
        console.error('[Formalization Helper] Failed to parse JSON block:', e);
      }
    }

    // If no JSON found, try to parse the entire response as JSON
    if (!structuredData) {
      try {
        structuredData = JSON.parse(formalizedText.trim());
        summary = 'Problem formalized from conversation';
        console.log('[Formalization Helper] Parsed entire response as JSON');
      } catch (e) {
        // No structured data available, use full text as summary
        console.warn('[Formalization Helper] No structured data extracted from response');
      }
    }

    // Validate that structuredData has required fields
    if (structuredData && (!structuredData.variables || !Array.isArray(structuredData.variables) || structuredData.variables.length === 0)) {
      console.warn('[Formalization Helper] Extracted JSON missing required variables array');
      structuredData = null;
    }

    // Add complete formalization message with structuredData
    config.sessionManager.addMessage(sessionId, 'ai', summary || formalizedText, {
      type: 'formalization',
      structuredData, // Add the extracted JSON here
    });

    // Update session status and reset readyToFormalize
    config.sessionManager.updateSession(sessionId, { 
      status: 'formalized',
      readyToFormalize: false 
    });

    return true;
  } catch (error) {
    console.error('[Formalization Helper] Error:', error);
    throw error;
  }
}

/**
 * Check if AI response indicates readiness to formalize
 */
export function detectFormalizationReadiness(text: string): {
  isReady: boolean;
  suggestsReformalizing: boolean;
  acknowledgesRestart: boolean;
} {
  const lowerText = text.toLowerCase();

  // Stricter detection: require mention of key components (variables, objectives, constraints)
  const isReady = (
    (lowerText.includes('enough information') || 
     lowerText.includes('ready to formalize') ||
     lowerText.includes('can now formalize') || 
     lowerText.includes('sufficient information')) &&
    (lowerText.includes('formalize') || lowerText.includes('formalise')) &&
    // Require mention of key components to ensure problem is well-defined
    (lowerText.includes('variable') || lowerText.includes('objective') || lowerText.includes('constraint'))
  ) || (
    (lowerText.includes('would you like') || 
     lowerText.includes('shall i') || 
     lowerText.includes('should i') || 
     lowerText.includes('want me to')) &&
    (lowerText.includes('formalize') || 
     lowerText.includes('formalise') || 
     lowerText.includes('structured') || 
     lowerText.includes('problem definition')) &&
    // Require mention of key components to ensure problem is well-defined
    (lowerText.includes('variable') || lowerText.includes('objective') || lowerText.includes('constraint'))
  );

  const suggestsReformalizing = (
    (lowerText.includes('re-formalize') || 
     lowerText.includes('refine') || 
     lowerText.includes('update')) &&
    (lowerText.includes('problem') || lowerText.includes('definition'))
  );

  const acknowledgesRestart = (
    lowerText.includes('start fresh') ||
    lowerText.includes('new problem') ||
    lowerText.includes('different problem') ||
    lowerText.includes('moving on') ||
    lowerText.includes("let's start") ||
    lowerText.includes("let's begin") ||
    (lowerText.includes('starting') && (lowerText.includes('over') || lowerText.includes('fresh')))
  );

  return {
    isReady,
    suggestsReformalizing,
    acknowledgesRestart,
  };
}
