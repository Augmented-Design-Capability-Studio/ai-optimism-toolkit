/**
 * Custom hook for managing researcher sessions
 */

import { useState, useEffect } from 'react';
import { sessionManager, Session } from '../../services/sessionManager';
import { useAIProvider } from '../../contexts/AIProviderContext';
import { executeFormalization } from '../../services/formalizationHelper';

export const useResearcherSessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isFormalizingId, setIsFormalizingId] = useState<string | null>(null);
  const [previousSessionIds, setPreviousSessionIds] = useState<Set<string>>(new Set());
  const [newSessionIds, setNewSessionIds] = useState<Set<string>>(new Set());
  const { state: aiState } = useAIProvider();

  // Load sessions
  const loadSessions = () => {
    const activeSessions = sessionManager.getActiveSessions();
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
    loadSessions();
    const interval = setInterval(loadSessions, 2000);
    return () => clearInterval(interval);
  }, []); // Empty dependency array - loadSessions uses functional updates

  // Handle terminate session
  const handleTerminateSession = (sessionId: string) => {
    if (!confirm('End this session gracefully? The user will see a notification and start fresh.')) {
      return;
    }
    sessionManager.updateSession(sessionId, { status: 'completed' });
    loadSessions();
  };

  // Handle delete session
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Permanently delete this session from records? This will terminate the session and cannot be undone.')) {
      return;
    }
    
    // First terminate the session so the user gets notified
    sessionManager.updateSession(sessionId, { status: 'completed' });
    
    // Wait for 2 polling cycles (2 seconds) to ensure the client detects the completion
    // The subscription polls every 1 second, so 2 seconds guarantees detection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Then delete it from records
    sessionManager.deleteSession(sessionId);
    
    if (selectedSession?.id === sessionId) {
      setSelectedSession(null);
    }
    loadSessions();
  };

  // Handle formalize problem
  const handleFormalizeProblem = async (sessionId: string) => {
    const session = sessionManager.getSession(sessionId);
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
      });
      
      loadSessions();
    } catch (error) {
      console.error('[ResearcherDashboard] Formalization error:', error);
    } finally {
      setIsFormalizingId(null);
    }
  };

  // Handle mode toggle
  const handleModeToggle = async (sessionId: string, newMode: 'ai' | 'experimental') => {
    const session = sessionManager.getSession(sessionId);
    if (!session) return;

    // Update mode
    sessionManager.updateSession(sessionId, { mode: newMode });
    
    // If switching TO AI mode and last message is from user, trigger AI response
    if (newMode === 'ai' && session.messages.length > 0) {
      const lastMessage = session.messages[session.messages.length - 1];
      if (lastMessage.sender === 'user' && aiState.apiKey) {
        // Set isAIResponding to show thinking indicator
        sessionManager.updateSession(sessionId, { isAIResponding: true });
        loadSessions();
        
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
            sessionManager.addMessage(sessionId, 'ai', aiResponse);
          }
        } catch (error) {
          console.error('[Mode Toggle] Failed to generate AI response:', error);
        } finally {
          // Clear isAIResponding flag
          sessionManager.updateSession(sessionId, { isAIResponding: false });
        }
      }
    }
    
    loadSessions();
  };

  // Handle create new session
  const handleCreateSession = () => {
    const newSession = sessionManager.createSession('experimental');
    setSelectedSession(newSession);
    loadSessions();
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
