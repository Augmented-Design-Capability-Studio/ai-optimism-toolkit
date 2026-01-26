import { CHAT_SYSTEM_PROMPT_V1, getFormalizationPromptV1, getComponentGenerationPromptV1 } from '@/clients/v1/prompts';
import { CHAT_SYSTEM_PROMPT_V2, getFormalizationPromptV2, getComponentGenerationPromptV2 } from '@/clients/v2/prompts';
import { CHAT_SYSTEM_PROMPT_V3, getFormalizationPromptV3, getComponentGenerationPromptV3 } from '@/clients/v3/prompts';
import { RESEARCHER_DRAFT_FORMAT_SYSTEM_APPENDIX, getDraftFormattingPrompt } from '@/clients/prompts/researcher';
import { isIncompleteFormalization } from '@/clients/prompts/utils';

export {
  CHAT_SYSTEM_PROMPT_V1,
  CHAT_SYSTEM_PROMPT_V2,
  CHAT_SYSTEM_PROMPT_V3,
  getFormalizationPromptV1,
  getFormalizationPromptV2,
  getFormalizationPromptV3,
  getComponentGenerationPromptV1,
  getComponentGenerationPromptV2,
  getComponentGenerationPromptV3,
  RESEARCHER_DRAFT_FORMAT_SYSTEM_APPENDIX,
  getDraftFormattingPrompt,
  isIncompleteFormalization,
};

export const CHAT_SYSTEM_PROMPT = CHAT_SYSTEM_PROMPT_V1;
export const getFormalizationPrompt = getFormalizationPromptV1;
export const getComponentGenerationPrompt = getComponentGenerationPromptV1;

export const getChatSystemPromptByVersion = (version?: string | null) => {
  if (version === 'v2') return CHAT_SYSTEM_PROMPT_V2;
  if (version === 'v3') return CHAT_SYSTEM_PROMPT_V3;
  return CHAT_SYSTEM_PROMPT_V1;
};

export const getFormalizationPromptByVersion = (
  version?: string | null,
  conversationContext?: string,
  jsonStructures?: {
    variables?: Array<Record<string, unknown>>;
    objectives?: Array<Record<string, unknown>>;
    constraints?: Array<Record<string, unknown>>;
    properties?: Array<Record<string, unknown>>;
  } | null
) => {
  if (!conversationContext) return getFormalizationPromptV1('', jsonStructures);
  if (version === 'v2') return getFormalizationPromptV2(conversationContext, jsonStructures);
  if (version === 'v3') return getFormalizationPromptV3(conversationContext, jsonStructures);
  return getFormalizationPromptV1(conversationContext, jsonStructures);
};

export const getComponentGenerationPromptByVersion = (
  version: string | null | undefined,
  component: 'variables' | 'properties' | 'objectives' | 'constraints',
  conversationContext: string,
  existingComponents?: {
    variables?: Array<Record<string, unknown>>;
    objectives?: Array<Record<string, unknown>>;
    constraints?: Array<Record<string, unknown>>;
    properties?: Array<Record<string, unknown>>;
  } | null
) => {
  if (version === 'v2') {
    return getComponentGenerationPromptV2(component, conversationContext, existingComponents);
  }
  if (version === 'v3') {
    return getComponentGenerationPromptV3(component, conversationContext, existingComponents);
  }
  return getComponentGenerationPromptV1(component, conversationContext, existingComponents);
};
