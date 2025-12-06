/**
 * Helper functions for message type checking and sizing
 */

import { Message } from '../../../core/services/sessionManager';

/**
 * Check if message is a special type that should always be full width
 */
export function isSpecialMessageType(message: Message): boolean {
  return (
    message.metadata?.type === 'formalization' ||
    message.metadata?.type === 'controls-generation' ||
    message.metadata?.type === 'optimization-run'
  );
}

/**
 * Check if message is short (less than one line)
 */
export function isShortMessage(message: Message): boolean {
  return (
    !isSpecialMessageType(message) &&
    message.content.length < 80 &&
    !message.content.includes('\n')
  );
}

/**
 * Get message sender label
 */
export function getMessageSenderLabel(message: Message): string {
  if (message.sender === 'user') return 'User';
  if (message.sender === 'researcher') return 'You (Researcher)';
  if (message.metadata?.type === 'formalization') return 'AI Formalization';
  if (message.metadata?.type === 'optimization-run') return 'Optimization Run';
  if (message.metadata?.type === 'controls-generation') return 'Controls Generation';
  return 'AI Assistant';
}

/**
 * Get avatar emoji for message (deprecated - use icons instead)
 * @deprecated Use Material-UI icons instead of emojis
 */
export function getAvatarEmoji(message: Message): string {
  if (message.sender === 'user') return 'user';
  if (message.sender === 'researcher') return 'researcher';
  return 'ai';
}

/**
 * Get avatar background color for message
 */
export function getAvatarColor(message: Message): string {
  if (message.sender === 'user') return 'primary.main';
  if (message.sender === 'researcher') return 'info.main';
  if (message.metadata?.type === 'controls-generation' && message.metadata?.controlsGenerated) {
    return 'secondary.main';
  }
  if (message.metadata?.type === 'optimization-run') return 'info.main';
  if (message.metadata?.type === 'formalization') return 'success.main';
  return 'secondary.main';
}

/**
 * Get message bubble background color
 */
export function getMessageBubbleColor(message: Message): string {
  if (message.sender === 'user') return 'grey.100';
  if (message.sender === 'researcher') return 'info.light';
  if (message.metadata?.incomplete) return 'rgba(255, 152, 0, 0.15)';
  if (message.metadata?.type === 'formalization') return 'success.light';
  if (message.metadata?.type === 'optimization-run') return 'info.light';
  if (message.metadata?.type === 'controls-generation' && message.metadata?.controlsGenerated) {
    return 'secondary.light';
  }
  if (message.metadata?.type === 'controls-generation' && message.metadata?.controlsError) {
    return 'rgba(255, 152, 0, 0.15)';
  }
  return 'grey.100';
}

/**
 * Get message bubble border styles
 */
export function getMessageBubbleBorder(message: Message): Record<string, any> | undefined {
  if (message.metadata?.type === 'formalization') {
    return {
      border: 2,
      borderColor: message.metadata?.incomplete ? 'warning.main' : 'success.main',
    };
  }
  if (message.metadata?.type === 'optimization-run') {
    return {
      border: 2,
      borderColor:
        message.metadata?.status === 'completed'
          ? 'info.main'
          : message.metadata?.status === 'failed'
          ? 'error.main'
          : 'default',
    };
  }
  if (message.metadata?.type === 'controls-generation' && message.metadata?.controlsGenerated) {
    return {
      border: 2,
      borderColor: 'secondary.main',
    };
  }
  if (message.metadata?.type === 'controls-generation' && message.metadata?.controlsError) {
    return {
      border: 2,
      borderColor: 'warning.main',
    };
  }
  return undefined;
}

