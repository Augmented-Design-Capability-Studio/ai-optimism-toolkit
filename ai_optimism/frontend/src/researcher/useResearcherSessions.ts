/**
 * Custom hook for managing researcher sessions
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSessionManager, Session } from '../core/services/sessionManager';
import { executeFormalization } from '../core/services/formalizationHelper';
import { getAIConfigKey } from '../core/services/sessionAIConfig';

export const useResearcherSessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isFormalizingId, setIsFormalizingId] = useState<string | null>(null);
  const [previousSessionIds, setPreviousSessionIds] = useState<Set<string>>(new Set());
  const [newSessionIds, setNewSessionIds] = useState<Set<string>>(new Set());
  const sessionManager = useSessionManager();
  const isLoadingRef = useRef(false); // Prevent overlapping requests

  // Store previous sessions hash to detect actual changes
  const previousSessionsHashRef = useRef<string>('');
  
  // Create a lightweight hash of sessions to detect changes
  // Exclude updatedAt since it's not a meaningful UI change
  const createSessionsHash = (sessions: Session[]): string => {
    return sessions.map(s => 
      `${s.id}:${s.status}:${s.mode}:${s.messages.length}`
    ).join('|');
  };
  
  // Load sessions - wrapped in useCallback to keep reference stable
  const loadSessions = useCallback(async () => {
    // Skip if already loading to prevent overlapping requests
    if (isLoadingRef.current) {
      return;
    }
    
    isLoadingRef.current = true;
    try {
    const activeSessions = await sessionManager.getActiveSessions();
    const currentSessionIds = new Set(activeSessions.map(s => s.id));
    
    // Create hash to detect if sessions actually changed
    const currentHash = createSessionsHash(activeSessions);
    const hasChanged = currentHash !== previousSessionsHashRef.current;
    
    // Detect new sessions (only if sessions changed)
    if (hasChanged) {
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
      
      previousSessionsHashRef.current = currentHash;
      setSessions(activeSessions);
      
      // If a session is selected, update it only if it changed
      setSelectedSession(current => {
        if (current) {
          const updated = activeSessions.find(s => s.id === current.id);
          if (updated) {
            // Only update if the session actually changed (excluding updatedAt)
            const currentHash = `${current.id}:${current.status}:${current.mode}:${current.messages.length}`;
            const updatedHash = `${updated.id}:${updated.status}:${updated.mode}:${updated.messages.length}`;
            if (currentHash !== updatedHash) {
              return updated;
            }
          }
          return updated || null;
        }
        return current;
      });
    }
    } finally {
      isLoadingRef.current = false;
    }
  }, [sessionManager]);

  // Initial load and polling
  useEffect(() => {
    loadSessions();
    const interval = setInterval(() => {
      loadSessions();
    }, 2000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  // Handle terminate session
  // Backend-routed: Updates session status through backend API (PUT /sessions/{id})
  // This ensures termination is synced across all devices accessing the researcher dashboard
  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm('End this session gracefully? The user will see a notification and start fresh.')) {
      return;
    }
    await sessionManager.updateSession(sessionId, { status: 'completed' });
    await loadSessions();
  };

  // Handle delete session (force delete - no new session created)
  // Backend-routed: Deletes session through backend API (DELETE /sessions/{id})
  // This ensures deletion is synced across all devices accessing the researcher dashboard
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
  // Frontend-triggered: Uses session AI config (pushed by researcher)
  // The formalization result and status update are then saved through backend API
  const handleFormalizeProblem = async (sessionId: string) => {
    const session = await sessionManager.getSession(sessionId);
    if (!session) return;

    // Get AI config from session (pushed by researcher)
    let apiKey: string | null = null;
    let provider = 'google';
    let model = 'gemini-2.5-flash';

    try {
      const aiConfig = await getAIConfigKey(sessionId);
      if (aiConfig) {
        apiKey = aiConfig.apiKey;
        provider = aiConfig.provider;
        model = aiConfig.model;
      }
    } catch (error) {
      console.error('[ResearcherDashboard] Failed to load session AI config:', error);
    }

    if (!apiKey) {
      alert('Please push an API key to this session first using the AI Connection Status chip.');
      return;
    }

    setIsFormalizingId(sessionId);

    try {
      await executeFormalization({
        sessionId,
        apiKey,
        model: model || 'gemini-2.5-flash',
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
  // Backend-routed: Updates session mode through backend API (PUT /sessions/{id})
  // This ensures mode changes are synced across all devices accessing the researcher dashboard
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
    
    // Reload sessions to ensure consistency
    await loadSessions();
  };

  // Handle create new session
  const handleCreateSession = async () => {
    const newSession = await sessionManager.createSession('experimental');
    setSelectedSession(newSession);
    await loadSessions();
  };

  // Get waiting sessions count - memoized to prevent recalculation
  const waitingCount = useMemo(() => {
    return sessions.filter(s => s.status === 'waiting').length;
  }, [sessions]);

  // Memoize handlers to prevent unnecessary re-renders
  const handleTerminateSessionMemo = useCallback(async (sessionId: string) => {
    if (!confirm('End this session gracefully? The user will see a notification and start fresh.')) {
      return;
    }
    await sessionManager.updateSession(sessionId, { status: 'completed' });
    await loadSessions();
  }, [sessionManager, loadSessions]);

  const handleDeleteSessionMemo = useCallback(async (sessionId: string) => {
    if (!confirm('Permanently delete this session from records? This will immediately terminate the session without creating a replacement.')) {
      return;
    }
    
    await sessionManager.deleteSession(sessionId);
    
    setSelectedSession(current => {
      if (current?.id === sessionId) {
        return null;
      }
      return current;
    });
    await loadSessions();
  }, [sessionManager, loadSessions]);

  const handleFormalizeProblemMemo = useCallback(async (sessionId: string) => {
    const session = await sessionManager.getSession(sessionId);
    if (!session) return;

    let apiKey: string | null = null;
    let provider = 'google';
    let model = 'gemini-2.5-flash';

    try {
      const aiConfig = await getAIConfigKey(sessionId);
      if (aiConfig) {
        apiKey = aiConfig.apiKey;
        provider = aiConfig.provider;
        model = aiConfig.model;
      }
    } catch (error) {
      console.error('[ResearcherDashboard] Failed to load session AI config:', error);
    }

    if (!apiKey) {
      alert('Please push an API key to this session first using the AI Connection Status chip.');
      return;
    }

    setIsFormalizingId(sessionId);

    try {
      await executeFormalization({
        sessionId,
        apiKey,
        model: model || 'gemini-2.5-flash',
        messages: session.messages,
        sessionManager,
      });
      
      await loadSessions();
    } catch (error) {
      console.error('[ResearcherDashboard] Formalization error:', error);
    } finally {
      setIsFormalizingId(null);
    }
  }, [sessionManager, loadSessions]);

  const handleModeToggleMemo = useCallback(async (sessionId: string, newMode: 'ai' | 'experimental') => {
    setSessions(currentSessions => 
      currentSessions.map(session => 
        session.id === sessionId ? { ...session, mode: newMode } : session
      )
    );
    setSelectedSession(current => 
      current?.id === sessionId ? { ...current, mode: newMode } : current
    );

    await sessionManager.updateSession(sessionId, { mode: newMode });
    await loadSessions();
  }, [sessionManager, loadSessions]);

  const handleCreateSessionMemo = useCallback(async () => {
    const newSession = await sessionManager.createSession('experimental');
    setSelectedSession(newSession);
    await loadSessions();
  }, [sessionManager, loadSessions]);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    sessions,
    selectedSession,
    setSelectedSession,
    isFormalizingId,
    newSessionIds,
    waitingCount,
    loadSessions,
    handleTerminateSession: handleTerminateSessionMemo,
    handleDeleteSession: handleDeleteSessionMemo,
    handleFormalizeProblem: handleFormalizeProblemMemo,
    handleModeToggle: handleModeToggleMemo,
    handleCreateSession: handleCreateSessionMemo,
  }), [
    sessions,
    selectedSession,
    isFormalizingId,
    newSessionIds,
    waitingCount,
    loadSessions,
    handleTerminateSessionMemo,
    handleDeleteSessionMemo,
    handleFormalizeProblemMemo,
    handleModeToggleMemo,
    handleCreateSessionMemo,
  ]);
}
