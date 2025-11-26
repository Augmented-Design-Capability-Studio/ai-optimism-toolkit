import { Session } from '../../../services/sessionManager';

interface UseFormalizationProps {
  currentSession: Session | null;
  sessionManager: any;
}

export function useFormalization({
  currentSession,
  sessionManager,
}: UseFormalizationProps) {
  const formalizeProblem = async () => {
    if (!currentSession) return;

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

