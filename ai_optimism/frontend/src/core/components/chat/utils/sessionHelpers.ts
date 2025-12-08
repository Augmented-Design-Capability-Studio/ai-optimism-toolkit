import { Session, Message } from '@/core/services/sessionManager';

/**
 * Get real user messages count (excluding Initialize)
 */
export function getRealUserMessageCount(messages: Message[]): number {
  return messages.filter(
    (m) => m.sender === 'user' && m.content !== 'Initialize'
  ).length;
}

/**
 * Check if session is in researcher-controlled mode
 */
export function isResearcherControlled(session: Session | null): boolean {
  return session?.mode === 'experimental';
}



