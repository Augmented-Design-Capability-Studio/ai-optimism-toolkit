import { useEffect, useState, useRef, useCallback } from 'react';
import { useSessionManager, Session } from '@/core/services/sessionManager';
import { useVersion } from '@/core/contexts/VersionContext';

export function useSessionLifecycle() {
  const sessionManager = useSessionManager();
  const version = useVersion();
  const versionName = typeof version === 'string' ? version : 'v1';
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessionDeleted, setSessionDeleted] = useState(false);
  const [sessionTerminated, setSessionTerminated] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const hasLoadedRef = useRef(false);

  // Load initial session once on mount
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadInitialSession = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionParam = urlParams.get('session');

        let session: Session | null = null;

        if (sessionParam) {
          session = await sessionManager.getSession(sessionParam);
          if (session && session.status !== 'completed') {
            sessionManager.setCurrentSession(session.id);
          } else {
            session = null;
          }
        }

        if (session) {
          setCurrentSession(session);
        } else {
          // Do not auto-create; show banner until user starts a new session
          setSessionDeleted(true);
          setCurrentSession(null);
          sessionManager.setCurrentSession(null);
        }
      } catch (error) {
        console.error('[useSessionLifecycle] Failed to load session:', error);
      } finally {
        setIsCreatingSession(false);
      }
    };

    loadInitialSession();
  }, [sessionManager, versionName]);

  // Extract session ID as a stable string to prevent unnecessary re-subscriptions
  const sessionId = currentSession?.id || null;
  const sessionDeletedRef = useRef(sessionDeleted);
  const sessionManagerRef = useRef(sessionManager);
  
  useEffect(() => {
    sessionDeletedRef.current = sessionDeleted;
  }, [sessionDeleted]);
  
  useEffect(() => {
    sessionManagerRef.current = sessionManager;
  }, [sessionManager]);

  // Simple polling (1s visible / 2s hidden) instead of subscription
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollInFlightRef = useRef(false);
  const lastSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Clear any existing timer when session changes or is missing
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (!sessionId) {
      lastSessionIdRef.current = null;
      return;
    }

    lastSessionIdRef.current = sessionId;

    const runPoll = async () => {
      if (pollInFlightRef.current) return;
      pollInFlightRef.current = true;
      try {
        const updatedSession = await sessionManagerRef.current.getSession(sessionId, 'useSessionLifecycle');

        if (sessionDeletedRef.current) return;

        if (!updatedSession) {
          sessionDeletedRef.current = true;
          setSessionDeleted(true);
          setCurrentSession(null);
          sessionManagerRef.current.setCurrentSession(null);
          return;
        }

        if (updatedSession.status === 'completed') {
          sessionDeletedRef.current = true;
          setSessionDeleted(true);
          setCurrentSession(null);
          sessionManagerRef.current.setCurrentSession(null);
          return;
        }

        const aiHash = (cfg: Session['aiConfig']) => cfg
          ? [
              cfg.status,
              cfg.provider,
              cfg.model,
              cfg.endpoint,
              cfg.setBy,
              cfg.setAt,
            ].join('|')
          : null;

        let shouldUpdate = false;
        setCurrentSession(prev => {
          if (!prev) return updatedSession;
          
          const hasChanges = 
            prev.messages.length !== updatedSession.messages.length ||
            prev.status !== updatedSession.status ||
            prev.mode !== updatedSession.mode ||
            aiHash(prev.aiConfig) !== aiHash(updatedSession.aiConfig);
          
          shouldUpdate = hasChanges;
          return hasChanges ? updatedSession : prev;
        });
        // Skip any downstream work if nothing changed
        if (!shouldUpdate) return;
      } catch (error) {
        // silent; next tick will retry
      } finally {
        pollInFlightRef.current = false;
      }
    };

    // Immediate fetch, then interval
    runPoll();
    const intervalMs = typeof document === 'undefined' ? 1000 : (!document.hidden ? 1000 : 2000);
    pollTimerRef.current = setInterval(runPoll, intervalMs);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [sessionId]);

  // Send heartbeat periodically via sessionManager shared heartbeat
  useEffect(() => {
    const sessionId = currentSession?.id;
    if (!sessionId || sessionDeleted) {
      return;
    }

    const stop = sessionManager.startHeartbeat(sessionId, 5000);
    return () => {
      stop();
    };
  }, [currentSession?.id, sessionDeleted]);

  const terminateSession = useCallback(async (reason: string) => {
    if (!currentSession?.id) return;

    try {
      await sessionManager.updateSession(currentSession.id, { status: 'completed' });
      setSessionTerminated(true);
      setSessionDeleted(true);
      setCurrentSession(null);
      sessionManager.setCurrentSession(null);
    } catch (error) {
      console.error('[useSessionLifecycle] Failed to terminate:', error);
    }
  }, [currentSession?.id, sessionManager]);

  const createNewSession = useCallback(async () => {
    setSessionDeleted(false);
    setSessionTerminated(false);
    setCurrentSession(null);
    setIsCreatingSession(true);
    
    try {
      const session = await sessionManager.createSession('experimental', 'default-user', undefined, versionName);
      sessionManager.setCurrentSession(session.id);
      
      const url = new URL(window.location.href);
      url.searchParams.set('session', session.id);
      window.history.replaceState({}, '', url.toString());
      
      setCurrentSession(session);
      return session;
    } catch (error) {
      console.error('[useSessionLifecycle] Failed to create session:', error);
      throw error;
    } finally {
      setIsCreatingSession(false);
    }
  }, [sessionManager, versionName]);

  return {
    currentSession,
    setCurrentSession,
    sessionDeleted,
    setSessionDeleted,
    sessionTerminated,
    setSessionTerminated,
    isCreatingSession,
    terminateSession,
    createNewSession,
  };
}
