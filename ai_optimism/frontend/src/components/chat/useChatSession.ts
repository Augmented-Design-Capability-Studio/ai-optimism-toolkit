'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useSessionManager, Session, SessionMode, Message } from '../../services/sessionManager';
import { useBackend } from '../../contexts/BackendContext';
import { executeFormalization, detectFormalizationReadiness } from '../../services/formalizationHelper';
import { getAIConfigKey } from '../../services/sessionAIConfig';

export function useChatSession() {
  const { state: backendState } = useBackend();
  const sessionManager = useSessionManager();
  
  // Session state
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessionDeleted, setSessionDeleted] = useState(false);
  const [sessionTerminated, setSessionTerminated] = useState(false);
  
  // AI config state
  const [sessionApiKey, setSessionApiKey] = useState<string>('');
  const [sessionProvider, setSessionProvider] = useState<string>('google');
  const [sessionModel, setSessionModel] = useState<string>('gemini-2.5-flash');
  
  // Input and optimistic messages
  const [input, setInput] = useState('');
  const [optimisticMessages, setOptimisticMessages] = useState<Map<string, {
    content: string;
    timestamp: number;
  }>>(new Map());
  
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Derived state
  const mode: SessionMode = currentSession?.mode || 'ai';
  const isResearcherControlled = mode === 'experimental';

  // Subscribe to session updates
  const subscribeToSession = (sessionId: string) => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    unsubscribeRef.current = sessionManager.subscribeToSession(sessionId, (updatedSession) => {
      // If session was already marked as deleted, don't process any updates
      if (sessionDeleted) {
        return;
      }

      if (!updatedSession) {
        // Session was deleted - stop subscription and mark as deleted
        console.log('[useChatSession] Session deleted by researcher - stopping subscription');
        setSessionDeleted(true);
        setCurrentSession(null);
        // Clear localStorage to prevent any retry attempts
        sessionManager.setCurrentSession(null);
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
        return;
      }

      if (updatedSession.status === 'completed') {
        // Session was terminated - stop subscription and mark as deleted
        console.log('[useChatSession] Session terminated by researcher - stopping subscription');
        setSessionDeleted(true);
        setCurrentSession(null);
        // Clear localStorage to prevent any retry attempts
        sessionManager.setCurrentSession(null);
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
        return;
      }

      setCurrentSession(updatedSession);
    });
  };

  // Track if we've attempted to load a session to prevent re-initialization
  const hasAttemptedLoadRef = useRef(false);

  // Load existing session on mount (if any) - NO AUTO CREATION
  useEffect(() => {
    // Prevent multiple load attempts
    if (hasAttemptedLoadRef.current) {
      return;
    }
    hasAttemptedLoadRef.current = true;

    const loadSession = async () => {
      try {

        // Check URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const sessionParam = urlParams.get('session');
        
        let session: Session | null = null;

        if (sessionParam) {
          session = await sessionManager.getSession(sessionParam);
          if (session && session.status !== 'completed') {
            console.log('[useChatSession] Loaded session from URL:', session.id);
            sessionManager.setCurrentSession(session.id);
          } else {
            session = null;
          }
        }

        // Check localStorage
        if (!session) {
          const localStorageId = localStorage.getItem('wizard_current_session');
          if (localStorageId) {
            try {
              session = await sessionManager.getSession(localStorageId);
              if (session && session.status !== 'completed') {
                console.log('[useChatSession] Loaded session from localStorage:', session.id);
                sessionManager.setCurrentSession(session.id);
              } else {
                // Session not found or completed - was deleted/cleared
                console.log('[useChatSession] Session from localStorage not found or completed - was deleted');
                setSessionDeleted(true);
                sessionManager.setCurrentSession(null);
                session = null;
              }
            } catch (error) {
              console.warn('[useChatSession] Error loading session from localStorage:', error);
              // On error, mark as deleted to prevent auto-creation
              setSessionDeleted(true);
              session = null;
            }
          }
        }

        // Try getCurrentSession as fallback (only if we don't have sessionDeleted set)
        if (!session && !sessionDeleted) {
          try {
            session = await sessionManager.getCurrentSession();
            if (session && session.status !== 'completed') {
              console.log('[useChatSession] Loaded current session:', session.id);
            } else {
              session = null;
            }
          } catch (error) {
            session = null;
          }
        }

        if (session && session.id) {
          setCurrentSession(session);
          subscribeToSession(session.id);
        } else {
          // No session found - mark as deleted so user can create one manually
          // DO NOT create session automatically
          setSessionDeleted(true);
        }
      } catch (error) {
        console.error('[useChatSession] Error loading session:', error);
        // On any error, mark as deleted to prevent auto-creation
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
  }, []); // Only run once on mount

  // Manual function to create a new session
  const createNewSession = async () => {
    try {
      console.log('[useChatSession] Creating new session manually');
      const session = await sessionManager.createSession('experimental');
      await sessionManager.updateSession(session.id, { status: 'active' });
      setCurrentSession(session);
      setSessionDeleted(false);
      subscribeToSession(session.id);
      console.log('[useChatSession] Created new session:', session.id);
    } catch (error) {
      console.error('[useChatSession] Error creating new session:', error);
      throw error;
    }
  };

  // Load and poll AI config
  useEffect(() => {
    if (!currentSession?.id) {
      setSessionApiKey('');
      setSessionProvider('google');
      setSessionModel('gemini-2.5-flash');
      return;
    }

    const loadConfig = async () => {
      try {
        const aiConfig = await getAIConfigKey(currentSession.id);
        if (aiConfig?.apiKey?.trim()) {
          setSessionApiKey(aiConfig.apiKey);
          setSessionProvider(aiConfig.provider);
          setSessionModel(aiConfig.model);
        } else {
          setSessionApiKey('');
          setSessionProvider('google');
          setSessionModel('gemini-2.5-flash');
        }
      } catch (error: any) {
        if (error?.response?.status !== 404) {
          console.warn('[useChatSession] Failed to load AI config:', error);
        }
        setSessionApiKey('');
      }
    };

    loadConfig();
    const interval = setInterval(loadConfig, 3000);
    return () => clearInterval(interval);
  }, [currentSession?.id]);

  // Create transport for AI chat
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: '/api/chat',
      body: {
        apiKey: sessionApiKey || '',
        provider: sessionProvider || 'google',
        model: sessionModel || 'gemini-2.5-flash',
      },
    });
  }, [sessionApiKey, sessionProvider, sessionModel]);

  const chatId = currentSession ? `chat-${currentSession.id}-${mode}` : 'chat-disconnected';
  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    transport,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Initialize AI greeting for new sessions
  useEffect(() => {
    if (!currentSession || !sessionApiKey || isResearcherControlled) return;
    const sessionMessages = Array.isArray(currentSession.messages) ? currentSession.messages : [];
    const isNewSession = sessionMessages.length === 0 && messages.length === 0 && !isLoading;
    if (isNewSession) {
      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: 'Initialize' }],
      });
    }
  }, [currentSession?.id, sessionApiKey, isResearcherControlled, messages.length, isLoading]);

  // Suppress API key errors when key is not loaded yet
  useEffect(() => {
    if (error && !sessionApiKey) {
      const isApiKeyError = error.message?.includes('API key required') || 
                           error.message?.includes('API key');
      if (isApiKeyError) {
        return; // Suppress
      }
    }
    if (error) {
      console.error('[useChatSession] Chat error:', error);
    }
  }, [error, sessionApiKey]);

  // Send heartbeats
  useEffect(() => {
    if (!currentSession) return;

    let interval: NodeJS.Timeout;
    let isVisible = !document.hidden;

    const sendHeartbeat = async () => {
      if (!isVisible) return;
      try {
        await sessionManager.sendHeartbeat(currentSession.id);
      } catch (error) {
        // Check if session still exists
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

  // Save AI responses to session
  useEffect(() => {
    if (isResearcherControlled || !currentSession || messages.length === 0 || status === 'streaming') {
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'assistant') return;

    const text = lastMessage.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || '';
    if (!text.trim()) return;

    const sessionMessages = Array.isArray(currentSession.messages) ? currentSession.messages : [];
    const exists = sessionMessages.some(m => m.sender === 'ai' && m.content === text);
    if (exists) return;

    const saveResponse = async () => {
      try {
        const freshSession = await sessionManager.getSession(currentSession.id);
        if (!freshSession) return;

        await sessionManager.addMessage(currentSession.id, 'ai', text);

        if (currentSession.status === 'waiting') {
          await sessionManager.updateSession(currentSession.id, { status: 'active' });
        }

        const freshMessages = Array.isArray(freshSession.messages) ? freshSession.messages : [];
        const realUserMessages = freshMessages.filter((m: Message) =>
          m.sender === 'user' && m.content !== 'Initialize'
        ).length;

        if (realUserMessages > 0) {
          const { isReady, suggestsReformalizing, acknowledgesRestart } = detectFormalizationReadiness(text);
          if (isReady && currentSession.status !== 'formalized') {
            await sessionManager.updateSession(currentSession.id, { readyToFormalize: true });
          } else if ((suggestsReformalizing || acknowledgesRestart) && currentSession.status === 'formalized') {
            await sessionManager.updateSession(currentSession.id, { status: 'active', readyToFormalize: false });
          }
        }
      } catch (error) {
        console.error('[useChatSession] Error saving AI response:', error);
      }
    };

    saveResponse();
  }, [messages, status, currentSession, isResearcherControlled]);

  // Check researcher messages for formalization readiness
  useEffect(() => {
    if (!isResearcherControlled || !currentSession) return;

    const check = async () => {
      try {
        const freshSession = await sessionManager.getSession(currentSession.id);
        if (!freshSession) return;

        const freshMessages = Array.isArray(freshSession.messages) ? freshSession.messages : [];
        const realUserMessages = freshMessages.filter((m: Message) =>
          m.sender === 'user' && m.content !== 'Initialize'
        ).length;

        if (realUserMessages > 0 && freshSession.status !== 'formalized') {
          const lastResearcherMessage = [...freshMessages]
            .reverse()
            .find((m: Message) => m.sender === 'researcher');

          if (lastResearcherMessage) {
            const { isReady } = detectFormalizationReadiness(lastResearcherMessage.content);
            if (isReady && !freshSession.readyToFormalize) {
              await sessionManager.updateSession(currentSession.id, { readyToFormalize: true });
            }
          }
        }
      } catch (error) {
        console.error('[useChatSession] Error checking researcher messages:', error);
      }
    };

    if (currentSession?.updatedAt) {
      check();
    }
  }, [currentSession?.updatedAt, currentSession?.id, isResearcherControlled, sessionManager]);

  // Handle message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || !currentSession?.id) {
      if (sessionDeleted) {
        alert('Your session has been deleted. Please create a new session.');
      }
      return;
    }

    const userMessageText = input.trim();
    setInput('');

    // Add optimistic message
    const optimisticId = `optimistic-${Date.now()}-${Math.random()}`;
    const optimisticTimestamp = Date.now();
    setOptimisticMessages(prev => {
      const newMap = new Map(prev);
      newMap.set(optimisticId, { content: userMessageText, timestamp: optimisticTimestamp });
      return newMap;
    });

    try {
      const message = await sessionManager.addMessage(currentSession.id, 'user', userMessageText);
      
      if (!message) {
        // Session was deleted
        setSessionDeleted(true);
        setCurrentSession(null);
        setOptimisticMessages(prev => {
          const newMap = new Map(prev);
          newMap.delete(optimisticId);
          return newMap;
        });
        return;
      }

      if (!isResearcherControlled) {
        if (!sessionApiKey?.trim()) {
          setOptimisticMessages(prev => {
            const newMap = new Map(prev);
            newMap.delete(optimisticId);
            return newMap;
          });
          alert('AI provider not configured yet. Please wait for the API key to be loaded.');
          return;
        }

        sendMessage({
          role: 'user',
          parts: [{ type: 'text', text: userMessageText }],
        });
      } else {
        await sessionManager.updateSession(currentSession.id, {
          status: 'waiting',
          readyToFormalize: false,
        });
      }
    } catch (error) {
      setOptimisticMessages(prev => {
        const newMap = new Map(prev);
        newMap.delete(optimisticId);
        return newMap;
      });
      
      console.error('[useChatSession] Error submitting message:', error);
      
      const errorMessage = String((error as any)?.message || '');
      if (errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('deleted')) {
        setSessionDeleted(true);
        setCurrentSession(null);
      }
    }
  };

  // Build display messages with optimistic updates
  const sessionMessages = Array.isArray(currentSession?.messages) ? currentSession.messages : [];
  const sessionDisplayMessages = sessionMessages.map(m => ({
    id: m.id,
    role: m.sender === 'researcher' ? 'assistant' : m.sender === 'ai' ? 'assistant' : m.sender,
    content: m.content,
    metadata: m.metadata,
  }));

  const confirmedUserMessages = useMemo(() => new Set(
    sessionDisplayMessages
      .filter(m => m.role === 'user')
      .map(m => m.content.trim())
  ), [sessionDisplayMessages]);

  const optimisticDisplayMessages = useMemo(() => {
    return Array.from(optimisticMessages.entries())
      .filter(([_, opt]) => !confirmedUserMessages.has(opt.content.trim()))
      .map(([id, opt]) => ({
        id,
        role: 'user' as const,
        content: opt.content,
        metadata: { optimistic: true, timestamp: opt.timestamp } as any,
      }));
  }, [optimisticMessages, confirmedUserMessages]);

  const displayMessages = useMemo(() => {
    const all = [...sessionDisplayMessages, ...optimisticDisplayMessages];
    return all.sort((a, b) => {
      const aMeta = a.metadata as any;
      const bMeta = b.metadata as any;
      const aTime = aMeta?.timestamp || (sessionMessages.find(m => m.id === a.id)?.timestamp || 0);
      const bTime = bMeta?.timestamp || (sessionMessages.find(m => m.id === b.id)?.timestamp || 0);
      return aTime - bTime;
    });
  }, [sessionDisplayMessages, optimisticDisplayMessages, sessionMessages]);

  // Clean up optimistic messages
  useEffect(() => {
    setOptimisticMessages(prev => {
      if (prev.size === 0) return prev;
      
      const confirmed = new Set(
        sessionMessages
          .filter(m => m.sender === 'user')
          .map(m => m.content.trim())
      );
      
      const newMap = new Map(prev);
      let changed = false;
      
      for (const [id, opt] of newMap.entries()) {
        if (confirmed.has(opt.content.trim()) || Date.now() - opt.timestamp > 10000) {
          newMap.delete(id);
          changed = true;
        }
      }
      
      return changed ? newMap : prev;
    });
  }, [sessionMessages]);

  const isWaitingForResearcher = isResearcherControlled && currentSession?.status === 'waiting';
  const isAILoading = !isResearcherControlled && (isLoading || currentSession?.isAIResponding === true);

  const getConversationText = () => {
    return displayMessages.map(m => `${m.role}: ${m.content}`).join('\n');
  };

  const formalizeProblem = async () => {
    if (!currentSession || !sessionApiKey) return;
    try {
      await executeFormalization({
        sessionId: currentSession.id,
        apiKey: sessionApiKey,
        model: sessionModel || 'gemini-2.5-flash',
        messages: currentSession.messages,
        sessionManager,
      });
    } catch (error) {
      console.error('[useChatSession] Formalization error:', error);
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
    input,
    setInput,
    currentSession,
    mode,
    displayMessages,
    isLoading: isAILoading,
    isWaitingForResearcher,
    sessionTerminated,
    sessionDeleted,
    apiKey: sessionApiKey,
    provider: sessionProvider,
    model: sessionModel,
    handleSubmit,
    getConversationText,
    formalizeProblem,
    resetFormalization,
    createNewSession, // Add manual session creation function
  };
}
