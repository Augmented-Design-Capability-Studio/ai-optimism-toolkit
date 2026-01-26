/**
 * Researcher prompt helpers (shared across versions)
 */

/**
 * System prompt appendix for researcher draft formatting
 * Used when researcher requests AI to format/improve their draft message
 * Appended to CHAT_SYSTEM_PROMPT for context-aware formatting
 */
export const RESEARCHER_DRAFT_FORMAT_SYSTEM_APPENDIX = `
IMPORTANT CONTEXT FOR DRAFT FORMATTING:
- You are helping a RESEARCHER colleague format their draft message, not a user seeking optimization help
- The researcher may write simple messages (like greetings) that don't need optimization guidance - just format them professionally
- When the draft contains optimization-related content, you can enhance it with better structure and clarity while maintaining optimization guidance principles
- Do NOT reject or criticize simple messages - just format them appropriately for the conversation context
- Your goal is to improve clarity and professionalism while preserving the researcher's intent, whether the message is simple or optimization-focused`;

/**
 * Prompt for formatting researcher draft messages
 * Used in: /app/api/sessions/[id]/ai-response/route.ts (when draft is provided)
 * 
 * @param draft - The draft text to format
 * @param conversationContext - Optional recent conversation context (last N messages)
 * @returns Formatted prompt for draft improvement
 */
export const getDraftFormattingPrompt = (
  draft: string,
  conversationContext?: string
): string => {
  return `You are helping a researcher improve and format a draft message. The researcher has typed a draft response and wants you to improve it for clarity, professionalism, and effectiveness while preserving their intent.

${conversationContext ? `Recent conversation context:\n${conversationContext}\n\n` : ''}Draft text to improve:
"""
${draft}
"""

Please improve and format this draft message. Make it clear, professional, and appropriate for the conversation context. Preserve the researcher's intent and main points, but improve clarity, grammar, and structure. Return only the improved text without any additional commentary or explanation.`;
};
