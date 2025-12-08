import { Message } from '@/core/services/sessionManager';

export type UseChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  parts: Array<{ type: 'text'; text: string }>;
};

/**
 * Convert backend messages to useChat format
 */
export function convertToUseChatMessages(messages: Message[]): UseChatMessage[] {
  return messages
    .filter((m) => m.sender === 'user' || m.sender === 'ai')
    .map((m) => {
      if (m.sender === 'user') {
        return {
          id: m.id,
          role: 'user' as const,
          parts: [{ type: 'text' as const, text: m.content }],
        };
      } else {
        return {
          id: m.id,
          role: 'assistant' as const,
          parts: [{ type: 'text' as const, text: m.content }],
        };
      }
    });
}

/**
 * Extract text content from AI SDK message format
 */
export function extractMessageText(msg: any): string {
  if (msg.parts && Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('');
  } else if (typeof msg.content === 'string') {
    return msg.content;
  } else if (msg.text) {
    return msg.text;
  }
  return '';
}



