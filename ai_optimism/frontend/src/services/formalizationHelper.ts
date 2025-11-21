/**
 * Shared formalization logic for both chat and researcher modes
 */

import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { Message } from './sessionManager';
import { getFormalizationPrompt, isIncompleteFormalization } from '../config/prompts';

export interface FormalizationConfig {
  sessionId: string;
  apiKey: string;
  model: string;
  messages: Message[];
  sessionManager: any; // Will be typed properly
}

/**
 * Execute formalization and add result to session
 * Returns true if successful, false otherwise
 */
export async function executeFormalization(config: FormalizationConfig): Promise<boolean> {
  const { sessionId, apiKey, model, messages } = config;

  try {
    // Build conversation context
    const conversationContext = messages
      .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    const formalizationPrompt = getFormalizationPrompt(conversationContext);

    // Initialize Google AI
    const google = createGoogleGenerativeAI({ apiKey });
    const aiModel = google(model || 'gemini-2.0-flash');

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

    // Add complete formalization message
    config.sessionManager.addMessage(sessionId, 'ai', formalizedText, {
      type: 'formalization',
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

  const isReady = (
    (lowerText.includes('enough information') || 
     lowerText.includes('ready to formalize') ||
     lowerText.includes('can now formalize') || 
     lowerText.includes('sufficient information')) &&
    (lowerText.includes('formalize') || lowerText.includes('formalise'))
  ) || (
    (lowerText.includes('would you like') || 
     lowerText.includes('shall i') || 
     lowerText.includes('should i') || 
     lowerText.includes('want me to')) &&
    (lowerText.includes('formalize') || 
     lowerText.includes('formalise') || 
     lowerText.includes('structured') || 
     lowerText.includes('problem definition'))
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
