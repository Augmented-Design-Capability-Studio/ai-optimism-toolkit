import { Session } from '@/core/services/sessionManager';

interface UseFormalizationProps {
  currentSession: Session | null;
  sessionManager: any;
  sendMessage?: (message?: any, options?: any) => Promise<any> | void;
}

export function useFormalization({
  currentSession,
  sessionManager,
  sendMessage,
}: UseFormalizationProps) {
  const formalizeProblem = async () => {
    if (!currentSession) return;

    // Always use the chat stream - sendMessage should always be available in AI mode
    if (!sendMessage) {
      throw new Error('Chat stream not available. Cannot formalize problem.');
    }

    try {
      const formalizePrompt = "Please formalize this optimization problem based on our conversation. Provide a complete structured problem definition with variables, objectives, constraints, and properties in JSON format.";
      
      // Send through the chat stream (no separate API call)
      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: formalizePrompt }],
      });
      
      return true;
    } catch (error) {
      console.error('[useFormalization] Error sending formalize message:', error);
      throw error;
    }
  };

  const resetFormalization = async () => {
    if (!currentSession) return;
    await sessionManager.updateSession(currentSession.id, {
      status: 'active',
      readyToFormalize: false,
    });
  };

  return {
    formalizeProblem,
    resetFormalization,
  };
}

