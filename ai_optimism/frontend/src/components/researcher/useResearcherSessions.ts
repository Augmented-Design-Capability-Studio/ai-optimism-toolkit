/**
 * Custom hook for managing researcher sessions
 */

import { useState, useEffect } from 'react';
import { useSessionManager, Session } from '../../services/sessionManager';
import { useAIProvider } from '../../contexts/AIProviderContext';
import { executeFormalization } from '../../services/formalizationHelper';

export const useResearcherSessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isFormalizingId, setIsFormalizingId] = useState<string | null>(null);
  const [previousSessionIds, setPreviousSessionIds] = useState<Set<string>>(new Set());
  const [newSessionIds, setNewSessionIds] = useState<Set<string>>(new Set());
  const { state: aiState } = useAIProvider();
  const sessionManager = useSessionManager();

  // Load sessions
  const loadSessions = async () => {
    const activeSessions = await sessionManager.getActiveSessions();
    const currentSessionIds = new Set(activeSessions.map(s => s.id));
    
    // Detect new sessions
    setPreviousSessionIds(prev => {
      if (prev.size > 0) {
        const newIds = new Set<string>();
        currentSessionIds.forEach(id => {
          if (!prev.has(id)) {
            newIds.add(id);
          }
        });
        if (newIds.size > 0) {
          setNewSessionIds(newIds);
          // Clear notification after 5 seconds
          setTimeout(() => {
            setNewSessionIds(new Set());
          }, 5000);
        }
      }
      return currentSessionIds;
    });
    
    setSessions(activeSessions);
    
    // If a session is selected, update it
    setSelectedSession(current => {
      if (current) {
        const updated = activeSessions.find(s => s.id === current.id);
        return updated || null;
      }
      return current;
    });
  };

  // Initial load and polling
  useEffect(() => {
    const loadAndPoll = async () => {
      await loadSessions();
      const interval = setInterval(async () => {
        await loadSessions();
      }, 2000);
      return () => clearInterval(interval);
    };
    
    const cleanup = loadAndPoll();
    return () => {
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, []); // Empty dependency array - loadSessions uses functional updates

  // Handle terminate session
  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm('End this session gracefully? The user will see a notification and start fresh.')) {
      return;
    }
    await sessionManager.updateSession(sessionId, { status: 'completed' });
    await loadSessions();
  };

  // Handle delete session (force delete - no new session created)
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Permanently delete this session from records? This will immediately terminate the session without creating a replacement.')) {
      return;
    }
    
    // Immediately delete without setting completed status
    // This won't trigger client-side session creation
    await sessionManager.deleteSession(sessionId);
    
    if (selectedSession?.id === sessionId) {
      setSelectedSession(null);
    }
    await loadSessions();
  };

  // Handle formalize problem
  const handleFormalizeProblem = async (sessionId: string) => {
    const session = await sessionManager.getSession(sessionId);
    if (!session) return;

    if (!aiState.apiKey || !aiState.provider || !aiState.model) {
      alert('Please connect to an AI provider before formalizing the problem.');
      return;
    }

    setIsFormalizingId(sessionId);

    try {
      await executeFormalization({
        sessionId,
        apiKey: aiState.apiKey,
        model: aiState.model || 'gemini-2.0-flash',
        messages: session.messages,
        sessionManager,
      });
      
      await loadSessions();
    } catch (error) {
      console.error('[ResearcherDashboard] Formalization error:', error);
    } finally {
      setIsFormalizingId(null);
    }
  };

  // Handle mode toggle
  const handleModeToggle = async (sessionId: string, newMode: 'ai' | 'experimental') => {
    // Optimistically update the local state first for immediate UI feedback
    setSessions(currentSessions => 
      currentSessions.map(session => 
        session.id === sessionId ? { ...session, mode: newMode } : session
      )
    );
    setSelectedSession(current => 
      current?.id === sessionId ? { ...current, mode: newMode } : current
    );

    // Then update the backend
    await sessionManager.updateSession(sessionId, { mode: newMode });
    
    // If switching TO AI mode and user is waiting for a response, trigger AI response
    if (newMode === 'ai') {
      const session = await sessionManager.getSession(sessionId);
      if (session && session.status === 'waiting' && session.messages.length > 0) {
        const lastMessage = session.messages[session.messages.length - 1];
        if (lastMessage.sender === 'user' && aiState.apiKey) {
          // Set isAIResponding to show thinking indicator
          await sessionManager.updateSession(sessionId, { isAIResponding: true });
          await loadSessions();
          
          // Trigger AI response for the pending user message
          try {
            const { streamText } = await import('ai');
            const { createGoogleGenerativeAI } = await import('@ai-sdk/google');

            const google = createGoogleGenerativeAI({
              apiKey: aiState.apiKey,
            });

            const model = google(aiState.model || 'gemini-2.0-flash');

            // Build conversation history for context
            const conversationMessages = session.messages.map(msg => ({
              role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
              content: msg.content,
            }));

            const result = await streamText({
              model,
              messages: conversationMessages,
            });

            let aiResponse = '';
            for await (const textPart of result.textStream) {
              aiResponse += textPart;
            }

            if (aiResponse.trim()) {
              await sessionManager.addMessage(sessionId, 'ai', aiResponse);
              // Set status back to active since we've responded
              await sessionManager.updateSession(sessionId, { status: 'active' });
            }
          } catch (error) {
            console.error('[Mode Toggle] Failed to generate AI response:', error);
          } finally {
            // Clear isAIResponding flag
            await sessionManager.updateSession(sessionId, { isAIResponding: false });
          }
        }
      }
    }
    
    // Reload sessions to ensure consistency
    await loadSessions();
  };

  // Handle create new session
  const handleCreateSession = async () => {
    const newSession = await sessionManager.createSession('experimental');
    setSelectedSession(newSession);
    await loadSessions();
  };

  // Get waiting sessions count
  const waitingCount = sessions.filter(s => s.status === 'waiting').length;

  return {
    sessions,
    selectedSession,
    setSelectedSession,
    isFormalizingId,
    newSessionIds,
    waitingCount,
    loadSessions,
    handleTerminateSession,
    handleDeleteSession,
    handleFormalizeProblem,
    handleModeToggle,
    handleCreateSession,
  };
}
