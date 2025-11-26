import { useEffect, useState, useRef } from 'react';
import { useSessionManager, Session } from '../../../services/sessionManager';

export function useSessionLifecycle() {
  const sessionManager = useSessionManager();
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessionDeleted, setSessionDeleted] = useState(false);
  const [sessionTerminated, setSessionTerminated] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const hasAttemptedLoadRef = useRef(false);

  const subscribeToSession = (sessionId: string) => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    unsubscribeRef.current = sessionManager.subscribeToSession(
      sessionId,
      (updatedSession) => {
        if (sessionDeleted) {
          return;
        }

        if (!updatedSession) {
          setSessionDeleted(true);
          setCurrentSession(null);
          sessionManager.setCurrentSession(null);
          if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
          }
          return;
        }

        if (updatedSession.status === 'completed') {
          setSessionDeleted(true);
          setCurrentSession(null);
          sessionManager.setCurrentSession(null);
          if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
          }
          return;
        }

        setCurrentSession(updatedSession);
      }
    );
  };

  useEffect(() => {
    if (hasAttemptedLoadRef.current) {
      return;
    }
    hasAttemptedLoadRef.current = true;

    const loadSession = async () => {
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

        if (!session) {
          const localStorageId = localStorage.getItem('wizard_current_session');
          if (localStorageId) {
            try {
              session = await sessionManager.getSession(localStorageId);
              if (session && session.status !== 'completed') {
                sessionManager.setCurrentSession(session.id);
              } else {
                setSessionDeleted(true);
                sessionManager.setCurrentSession(null);
                session = null;
              }
            } catch (error) {
              setSessionDeleted(true);
              session = null;
            }
          }
        }

        if (!session && !sessionDeleted) {
          try {
            session = await sessionManager.getCurrentSession();
            if (!session || session.status === 'completed') {
              session = null;
            }
          } catch (error) {
            session = null;
          }
        }

        if (session?.id) {
          setCurrentSession(session);
          subscribeToSession(session.id);
        } else {
          setSessionDeleted(true);
        }
      } catch (error) {
        console.error('[useSessionLifecycle] Error loading session:', error);
        setSessionDeleted(true);
      }
    };

    loadSession();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  const createNewSession = async () => {
    try {
      const session = await sessionManager.createSession('experimental');
      await sessionManager.updateSession(session.id, { status: 'active' });
      setCurrentSession(session);
      setSessionDeleted(false);
      subscribeToSession(session.id);
      return session;
    } catch (error) {
      console.error('[useSessionLifecycle] Error creating new session:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!currentSession) return;

    let interval: NodeJS.Timeout;
    let isVisible = !document.hidden;

    const sendHeartbeat = async () => {
      if (!isVisible) return;
      try {
        await sessionManager.sendHeartbeat(currentSession.id);
      } catch (error) {
        try {
          const session = await sessionManager.getSession(currentSession.id);
          if (!session) {
            setSessionDeleted(true);
            setCurrentSession(null);
          }
        } catch {
          setSessionDeleted(true);
          setCurrentSession(null);
        }
      }
    };

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) sendHeartbeat();
    };

    sendHeartbeat();
    interval = setInterval(sendHeartbeat, 10000);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentSession, sessionManager]);

  return {
    currentSession,
    setCurrentSession,
    sessionDeleted,
    setSessionDeleted,
    sessionTerminated,
    setSessionTerminated,
    createNewSession,
  };
}

