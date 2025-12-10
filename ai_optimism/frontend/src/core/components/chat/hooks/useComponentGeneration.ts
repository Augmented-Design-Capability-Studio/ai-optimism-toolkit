import { Session } from '@/core/services/sessionManager';
import { getComponentGenerationPrompt } from '@/core/config/prompts';
import { aggregateControlsFromMessages } from '@/clients/v1/services/controlsAggregator';

interface UseComponentGenerationProps {
  currentSession: Session | null;
  sessionManager: any;
  sendMessage?: (message?: any, options?: any) => Promise<any> | void;
}

/**
 * Hook for generating optimization problem components through the chat stream
 * Similar to useFormalization, but for specific components (variables, objectives, etc.)
 */
export function useComponentGeneration({
  currentSession,
  sessionManager,
  sendMessage,
}: UseComponentGenerationProps) {
  const generateComponent = async (component: 'variables' | 'properties' | 'objectives' | 'constraints') => {
    if (!currentSession) return;

    if (!sendMessage) {
      throw new Error('Chat stream not available. Cannot generate component.');
    }

    try {
      // Get conversation context
      const conversationText = currentSession.messages
        ?.map((m) => {
          const role = m.sender === 'user' ? 'User' : m.sender === 'researcher' ? 'Researcher' : 'AI';
          return `${role}: ${m.content}`;
        })
        .join('\n\n') || '';

      // Extract existing components from messages for context
      // This helps AI understand what's already defined and avoid duplicates
      const existingControls = aggregateControlsFromMessages(currentSession.messages || []);
      const existingComponents = existingControls ? {
        variables: existingControls.variables || [],
        objectives: existingControls.objectives || [],
        constraints: existingControls.constraints || [],
        properties: existingControls.properties || [],
      } : undefined;

      // Generate prompt using the same function used by API
      // The prompt already includes instructions to fill missing values with reasonable defaults
      const prompt = getComponentGenerationPrompt(
        component,
        conversationText,
        existingComponents
      );

      // The prompt function already includes instructions to fill missing values
      // with reasonable sample/starting point values

      // Send through the chat stream (no separate API call)
      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: prompt }],
      });
      
      return true;
    } catch (error) {
      console.error('[useComponentGeneration] Error sending component generation message:', error);
      throw error;
    }
  };

  return {
    generateComponent,
  };
}

