import { Session } from '@/core/services/sessionManager';

interface UseFormalizationProps {
  currentSession: Session | null;
  sessionManager: any;
  sendMessage?: (message: { role: 'user'; content: string } | { role: 'user'; parts: Array<{ type: 'text'; text: string }> }) => void;
}

export function useFormalization({
  currentSession,
  sessionManager,
  sendMessage,
}: UseFormalizationProps) {
  const formalizeProblem = async () => {
    if (!currentSession) return;

    // If sendMessage is provided, use the chat stream approach
    if (sendMessage) {
      try {
        const formalizePrompt = "Please formalize this optimization problem based on our conversation. Provide a complete structured problem definition with variables, objectives, constraints, and properties in JSON format.";
        
        // Send through the chat stream
        sendMessage({
          role: 'user',
          parts: [{ type: 'text', text: formalizePrompt }],
        });
        
        return true;
      } catch (error) {
        console.error('[useFormalization] Error sending formalize message:', error);
        throw error;
      }
    }

    // Fallback to API call for backward compatibility or researcher mode
    try {
      const response = await fetch(`/api/sessions/${currentSession.id}/formalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: currentSession.messages,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to formalize problem';
        try {
          const error = await response.json();
          errorMessage = error.error || error.details || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = `Failed to formalize problem: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Format the formalization text
      const formalizationText = result.summary || 'Problem formalized from conversation';
      const structuredData = result.controls;

      // Add formalization message to session
      await sessionManager.addMessage(
        currentSession.id,
        'ai',
        formalizationText,
        {
          type: 'formalization',
          structuredData,
        }
      );

      // Update session status
      await sessionManager.updateSession(currentSession.id, {
        status: 'formalized',
        readyToFormalize: false,
      });

      return true;
    } catch (error) {
      console.error('[useFormalization] Error:', error);
      
      // Save error as a formalization message so it appears in the UI
      const errorMessage = error instanceof Error ? error.message : 'Failed to formalize problem';
      try {
        await sessionManager.addMessage(
          currentSession.id,
          'ai',
          `❌ Formalization failed: ${errorMessage}\n\nPlease check the conversation and try again, or contact support if the issue persists.`,
          {
            type: 'formalization',
            incomplete: true,
            error: true,
            errorDetails: errorMessage,
          }
        );
      } catch (saveError) {
        console.error('[useFormalization] Failed to save error message:', saveError);
      }
      
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

