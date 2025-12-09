/**
 * Utilities for filtering and optimizing messages before sending to AI
 * Reduces payload size while preserving important context
 */

import type { Message } from '../services/sessionManager';

/**
 * Filter messages for full AI response generation
 * Only includes messages up to the last user message, with reasonable limits
 * 
 * @param messages - All session messages
 * @param options - Filtering options
 * @returns Filtered messages for AI response
 */
export function filterMessagesForAIResponse(
  messages: Message[],
  options: {
    maxMessages?: number; // Maximum messages to include (default: 100)
    preserveAllUserMessages?: boolean; // If true, always include all user messages even if over limit
  } = {}
): Message[] {
  const { maxMessages = 100, preserveAllUserMessages = true } = options;

  // Find last user message
  let lastUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender === 'user') {
      lastUserIndex = i;
      break;
    }
  }

  if (lastUserIndex === -1) {
    return [];
  }

  // Only include messages up to last user message
  let filtered = messages.slice(0, lastUserIndex + 1);

  // If we have too many messages, we need to be smart about truncation
  if (filtered.length > maxMessages) {
    if (preserveAllUserMessages) {
      // Count user messages
      const userMessageIndices: number[] = [];
      filtered.forEach((msg, idx) => {
        if (msg.sender === 'user') {
          userMessageIndices.push(idx);
        }
      });

      // If we have many user messages, keep all of them plus context around each
      // Otherwise, keep last N messages
      if (userMessageIndices.length > maxMessages / 2) {
        // Too many user messages - keep last maxMessages
        filtered = filtered.slice(-maxMessages);
      } else {
        // Keep all user messages + context around them
        // Start from the earliest user message we can fit
        const earliestUserIndex = Math.max(0, lastUserIndex - maxMessages + userMessageIndices.length);
        filtered = filtered.slice(earliestUserIndex);
      }
    } else {
      // Simple truncation: keep last N messages
      filtered = filtered.slice(-maxMessages);
    }
  }

  return filtered;
}

/**
 * Filter messages for component generation
 * Smart filtering based on component type and dependencies
 * 
 * @param messages - All session messages
 * @param component - Component type being generated
 * @param options - Filtering options
 * @returns Filtered messages for component generation
 */
export function filterMessagesForComponent(
  messages: Message[],
  component: 'variables' | 'properties' | 'objectives' | 'constraints',
  options: {
    maxMessages?: number; // Maximum messages to include (default: 80)
    includeVariablesContext?: boolean; // Include messages where variables were defined (default: true)
  } = {}
): Message[] {
  const { maxMessages = 80, includeVariablesContext = true } = options;

  // For variables: include all messages (they might contain variable definitions)
  if (component === 'variables') {
    // But still limit to prevent huge payloads
    if (messages.length > maxMessages * 2) {
      // For very long conversations, keep first 20% (might have early variable mentions)
      // and last 80% (recent context)
      const earlyCutoff = Math.floor(messages.length * 0.2);
      const recentStart = messages.length - Math.floor(maxMessages * 1.6);
      const earlyMessages = messages.slice(0, earlyCutoff);
      const recentMessages = messages.slice(recentStart);
      // Merge and dedupe by ID
      const combined = [...earlyMessages, ...recentMessages];
      const seen = new Set<string>();
      return combined.filter(msg => {
        if (seen.has(msg.id)) return false;
        seen.add(msg.id);
        return true;
      });
    }
    return messages;
  }

  // For other components: find where variables were first defined
  let variablesDefinedIndex = -1;
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (
      msg.metadata?.type === 'variables-update' ||
      msg.metadata?.type === 'formalization' ||
      (msg.metadata?.structuredData && 
       typeof msg.metadata.structuredData === 'object' &&
       'variables' in msg.metadata.structuredData &&
       Array.isArray((msg.metadata.structuredData as any).variables) &&
       (msg.metadata.structuredData as any).variables.length > 0)
    ) {
      variablesDefinedIndex = i;
      break;
    }
  }

  if (variablesDefinedIndex >= 0 && includeVariablesContext) {
    // Include messages from variables definition onwards
    const afterVariables = messages.slice(variablesDefinedIndex);
    
    // Also include last N messages for recent context
    const recentMessages = messages.slice(-Math.min(30, Math.floor(maxMessages * 0.4)));
    
    // Merge and dedupe
    const combined = [...afterVariables, ...recentMessages];
    const seen = new Set<string>();
    const merged = combined.filter(msg => {
      if (seen.has(msg.id)) return false;
      seen.add(msg.id);
      return true;
    });

    // Limit total size
    if (merged.length > maxMessages) {
      // Keep the variable definition message and recent messages
      const variableMsg = merged.find(m => m.id === messages[variablesDefinedIndex].id);
      const withoutVariable = merged.filter(m => m.id !== variableMsg?.id);
      const recent = withoutVariable.slice(-(maxMessages - 1));
      return variableMsg ? [variableMsg, ...recent] : recent.slice(-maxMessages);
    }

    return merged;
  }

  // Fallback: last N messages
  return messages.slice(-maxMessages);
}

/**
 * Filter messages for draft formatting
 * Only needs recent context for better formatting
 * 
 * @param messages - All session messages
 * @param options - Filtering options
 * @returns Filtered messages for draft formatting
 */
export function filterMessagesForDraftFormatting(
  messages: Message[],
  options: {
    contextMessages?: number; // Number of recent messages for context (default: 6)
  } = {}
): Message[] {
  const { contextMessages = 6 } = options;
  return messages.slice(-contextMessages);
}

/**
 * Format messages as conversation text for prompts
 * Converts message array to readable conversation format
 * 
 * @param messages - Messages to format
 * @returns Formatted conversation text
 */
export function formatMessagesAsConversation(messages: Message[]): string {
  return messages
    .map((msg) => {
      const role = 
        msg.sender === 'user' ? 'User' : 
        msg.sender === 'researcher' ? 'Researcher' : 
        'AI';
      return `${role}: ${msg.content}`;
    })
    .join('\n\n');
}

/**
 * Truncate individual message content if too long
 * Preserves message structure but limits content size
 * 
 * @param messages - Messages to truncate
 * @param maxContentLength - Maximum content length per message (default: 2000)
 * @returns Messages with truncated content
 */
export function truncateMessageContent(
  messages: Message[],
  maxContentLength: number = 2000
): Message[] {
  return messages.map(msg => {
    if (msg.content.length <= maxContentLength) {
      return msg;
    }
    return {
      ...msg,
      content: msg.content.substring(0, maxContentLength) + '... [truncated]',
    };
  });
}

