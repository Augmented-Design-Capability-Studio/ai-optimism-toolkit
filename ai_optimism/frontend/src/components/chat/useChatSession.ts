'use client';

import { useEffect, useState, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useSessionManager, Session, SessionMode, Message } from '../../services/sessionManager';
import { useAIProvider } from '../../contexts/AIProviderContext';
import { executeFormalization, detectFormalizationReadiness } from '../../services/formalizationHelper';

export function useChatSession() {
  const { state } = useAIProvider();
  const { apiKey, provider, model } = state;
  const sessionManager = useSessionManager();

  const [input, setInput] = useState('');
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessionTerminated, setSessionTerminated] = useState(false);

  // Determine current mode from session
  const mode: SessionMode = currentSession?.mode || 'ai';
  const isResearcherControlled = mode === 'experimental';

  // Clear any stale chat state from previous sessions when no API key is present
  useEffect(() => {
    if (!apiKey && typeof window !== 'undefined') {
      const keysToRemove = Object.keys(localStorage).filter(key =>
        key.startsWith('chat-') || key.includes('optimization-chat')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  }, [apiKey]);

  // Helper to show termination notification
  const showTerminationNotification = () => {
    setSessionTerminated(true);
    setTimeout(() => setSessionTerminated(false), 5000);
  };

  // Subscribe to session updates
  let currentUnsubscribe: (() => void) | null = null;

  const subscribeToCurrentSession = (sessionId: string) => {
    // Clean up previous subscription if it exists
    if (currentUnsubscribe) {
      currentUnsubscribe();
    }

    currentUnsubscribe = sessionManager.subscribeToSession(sessionId, async (updatedSession) => {
      if (updatedSession) {
        if (updatedSession.status === 'completed') {
          showTerminationNotification();
          const newSession = await sessionManager.createSession('ai');
          console.log('[useChatSession] Session terminated, created new session:', newSession.id);

          // Explicitly ensure new session starts with active status (not waiting)
          await sessionManager.updateSession(newSession.id, { status: 'active' });
          setCurrentSession(newSession);

          // Restart subscription for new session
          subscribeToCurrentSession(newSession.id);
        } else {
          setCurrentSession(updatedSession);
        }
      } else {
        // Session was deleted (subscription returned null)
        console.warn('[useChatSession] Session was deleted, creating new session');
        const newSession = await sessionManager.createSession('experimental');
        await sessionManager.updateSession(newSession.id, { status: 'active' });
        setCurrentSession(newSession);
        setSessionTerminated(true);
        setTimeout(() => setSessionTerminated(false), 5000);

        // Restart subscription for new session
        subscribeToCurrentSession(newSession.id);
      }
    });
  };

  // Initialize or load session on mount
  useEffect(() => {
    const initializeSession = async () => {
      console.log('[useChatSession] initializeSession called');

      // Check for session parameter in URL
      const urlParams = new URLSearchParams(window.location.search);
      const sessionParam = urlParams.get('session');

      let session;

      if (sessionParam) {
        // Try to load the specified session
        session = await sessionManager.getSession(sessionParam);
        if (session) {
          console.log('[useChatSession] Loaded session from URL parameter:', session.id);
          // Set as current session
          sessionManager.setCurrentSession(session.id);
        } else {
          console.warn('[useChatSession] Session from URL parameter not found:', sessionParam);
        }
      }

      // If no session from URL or session not found, get current session
      if (!session) {
        session = await sessionManager.getCurrentSession();
      }

      // Always ensure there's a session
      if (!session || session.status === 'completed') {
        if (session?.status === 'completed') {
          showTerminationNotification();
        }
        // Create session in experimental mode so researchers can always see it
        session = await sessionManager.createSession('experimental');
        // Explicitly ensure new session starts fresh
        await sessionManager.updateSession(session.id, { status: 'active' });
        console.log('[useChatSession] Created new experimental session:', session.id);
      }

      setCurrentSession(session);

      // Subscribe to session updates
      subscribeToCurrentSession(session.id);

      // Return cleanup function
      return () => {
        if (currentUnsubscribe) {
          currentUnsubscribe();
        }
      };
    };

    initializeSession();

    // Return cleanup function
    return () => {
      if (currentUnsubscribe) {
        currentUnsubscribe();
      }
    };
  }, []);

  // Create transport with body containing API key, provider, and model
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: '/api/chat',
      body: {
        apiKey: apiKey || '',
        provider: provider || 'google',
        model: model || 'gemini-2.0-flash',
      },
    });
  }, [apiKey, provider, model]);

  // Use session ID as chat ID, but include mode to force reset when mode changes
  const chatId = currentSession ? `chat-${currentSession.id}-${mode}` : 'chat-disconnected';

  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    transport,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Initialize AI greeting for new AI-mode sessions
  useEffect(() => {
    if (!currentSession || !apiKey || isResearcherControlled) return;

    // Check if session has no messages and useChat has no messages (new session)
    const sessionMessages = Array.isArray(currentSession.messages) ? currentSession.messages : [];
    const isNewSession = sessionMessages.length === 0 && messages.length === 0 && !isLoading;

    // Check if we just switched to AI mode (useChat was reset due to mode change)
    const justSwitchedToAIMode = sessionMessages.length > 0 && messages.length === 0 && !isLoading;

    if (isNewSession || justSwitchedToAIMode) {
      console.log('[useChatSession] Initializing AI for session:', isNewSession ? 'new session' : 'mode switch to AI');

      if (justSwitchedToAIMode) {
        // When switching to AI mode, the researcher dashboard handles AI responses
        // No need to trigger from client-side to avoid duplicates
        console.log('[useChatSession] Switched to AI mode - researcher dashboard will handle responses if needed');
      } else {
        // Send an initialization prompt to get the AI's greeting for new sessions
        sendMessage({
          role: 'user',
          parts: [{ type: 'text', text: 'Initialize' }],
        });
      }
    }
  }, [currentSession?.id, currentSession?.mode, apiKey, isResearcherControlled, messages.length, isLoading]);

  // Log errors (but suppress API key errors when not connected)
  useEffect(() => {
    if (error && apiKey) {
      console.error('[ChatPanel] Chat error:', error);
    }
  }, [error, apiKey]);

  // Send periodic heartbeats to indicate client is active
  useEffect(() => {
    if (!currentSession) return;

    const sendHeartbeat = async () => {
      try {
        await sessionManager.sendHeartbeat(currentSession.id);
      } catch (error) {
        console.warn('[useChatSession] Heartbeat failed, session may be deleted:', error);
        // Try to create a new session
        try {
          const newSession = await sessionManager.createSession('experimental');
          await sessionManager.updateSession(newSession.id, { status: 'active' });
          setCurrentSession(newSession);
          setSessionTerminated(true);
          setTimeout(() => setSessionTerminated(false), 5000);
          // Restart subscription for new session
          subscribeToCurrentSession(newSession.id);
        } catch (createError) {
          console.error('[useChatSession] Failed to create new session after heartbeat failure:', createError);
        }
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat every 10 seconds
    const heartbeatInterval = setInterval(sendHeartbeat, 10000);

    return () => clearInterval(heartbeatInterval);
  }, [currentSession, sessionManager]);

  // Save AI responses to session when they complete
  useEffect(() => {
    const saveAIResponse = async () => {
      if (!isResearcherControlled && currentSession && messages.length > 0 && status !== 'streaming') {
        const lastMessage = messages[messages.length - 1];

        if (lastMessage.role === 'assistant') {
          const text = lastMessage.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || '';

          // Check if this message is already in session to avoid duplicates
          const sessionMessages = Array.isArray(currentSession.messages) ? currentSession.messages : [];
          const existingMessage = sessionMessages.find(m =>
            m.sender === 'ai' && m.content === text
          );

          if (text.trim() && !existingMessage) {
            // Get fresh session data from storage to check user message count
            const freshSession = await sessionManager.getSession(currentSession.id);

            // Only check for formalization readiness if there are actual user messages (excluding initialization)
            // This prevents the initialization greeting or responses to simple commands from triggering readiness detection
            const freshMessages = Array.isArray(freshSession?.messages) ? freshSession.messages : [];
            const realUserMessages = freshMessages.filter((m: Message) =>
              m.sender === 'user' && m.content !== 'Initialize'
            ).length;

            console.log('[useChatSession] Saving AI message, realUserMessages:', realUserMessages);
            await sessionManager.addMessage(currentSession.id, 'ai', text);

            // Set status back to active since we've responded to the user
            if (currentSession.status === 'waiting') {
              await sessionManager.updateSession(currentSession.id, { status: 'active' });
            }

            // Only check for formalization readiness if there are real user messages
            if (realUserMessages > 0) {
              // Check for formalization readiness signals
              const { isReady, suggestsReformalizing, acknowledgesRestart } = detectFormalizationReadiness(text);

              if (isReady && currentSession.status !== 'formalized') {
                console.log('[useChatSession] AI indicated readiness to formalize');
                await sessionManager.updateSession(currentSession.id, { readyToFormalize: true });
              } else if ((suggestsReformalizing || acknowledgesRestart) && currentSession.status === 'formalized') {
                console.log('[useChatSession] AI suggests re-formalization, resetting status');
                await sessionManager.updateSession(currentSession.id, { status: 'active', readyToFormalize: false });
              }
            } else {
              console.log('[useChatSession] Skipping readiness check - no real user messages yet');
            }
          }
        }
      }
    };

    saveAIResponse();
  }, [messages, status, currentSession, isResearcherControlled]);

  // Check researcher messages for formalization readiness in Experimental mode
  // Note: Backend also checks this automatically, but this ensures frontend state stays in sync
  useEffect(() => {
    const checkResearcherMessages = async () => {
      if (isResearcherControlled && currentSession) {
        // Get fresh session data to check for new researcher messages
        const freshSession = await sessionManager.getSession(currentSession.id);
        if (!freshSession) return;

        // Only check if there are real user messages (excluding initialization)
        const freshMessages = Array.isArray(freshSession.messages) ? freshSession.messages : [];
        const realUserMessages = freshMessages.filter((m: Message) =>
          m.sender === 'user' && m.content !== 'Initialize'
        ).length;

        if (realUserMessages > 0 && freshSession.status !== 'formalized') {
          // Get the last researcher message
          const lastResearcherMessage = [...freshMessages]
            .reverse()
            .find((m: Message) => m.sender === 'researcher');

          if (lastResearcherMessage) {
            // Check for readiness keywords (backend also does this, but sync frontend state)
            const { isReady } = detectFormalizationReadiness(lastResearcherMessage.content);

            // Only update if the state doesn't match what we detected
            // This avoids unnecessary updates since backend already handles this
            if (isReady && !freshSession.readyToFormalize) {
              console.log('[useChatSession] Researcher message indicates readiness to formalize (syncing frontend state)');
              await sessionManager.updateSession(currentSession.id, { readyToFormalize: true });
            }
          }
        }
      }
    };

    // Only check when session updates (new messages added)
    if (currentSession?.updatedAt) {
      checkResearcherMessages();
    }
  }, [currentSession?.updatedAt, currentSession?.id, isResearcherControlled, sessionManager]);

  // Handle message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentSession) return;

    try {
      // Always save user message to session
      const message = await sessionManager.addMessage(currentSession.id, 'user', input);

      if (!message) {
        // Session was deleted, create a new one
        console.warn('[useChatSession] Session was deleted, creating new session');
        const newSession = await sessionManager.createSession('experimental');
        await sessionManager.updateSession(newSession.id, { status: 'active' });
        setCurrentSession(newSession);

        // Restart subscription for new session
        subscribeToCurrentSession(newSession.id);

        // Retry adding the message to the new session
        await sessionManager.addMessage(newSession.id, 'user', input);

        // Show notification
        setSessionTerminated(true);
        setTimeout(() => setSessionTerminated(false), 5000);

        setInput('');
        return;
      }

      // If in AI mode (not researcher-controlled), also send to AI
      if (!isResearcherControlled && apiKey) {
        const userMessage = input;
        setInput('');

        // Send to AI
        sendMessage({
          role: 'user',
          parts: [{ type: 'text', text: userMessage }],
        });

        // AI response will be handled by streaming and saved when complete
        // We'll need to watch for the response and save it
      } else {
        // In experimental mode, set status to waiting since user is waiting for researcher
        // Also reset readyToFormalize when user sends a new message (conversation continues)
        if (isResearcherControlled) {
          await sessionManager.updateSession(currentSession.id, {
            status: 'waiting',
            readyToFormalize: false
          });
        }
        setInput('');
      }
    } catch (error) {
      console.error('[useChatSession] Error submitting message:', error);
      // If there's an error, try to create a new session
      try {
        const newSession = await sessionManager.createSession('experimental');
        await sessionManager.updateSession(newSession.id, { status: 'active' });
        setCurrentSession(newSession);
        setSessionTerminated(true);
        setTimeout(() => setSessionTerminated(false), 5000);
        // Restart subscription for new session
        subscribeToCurrentSession(newSession.id);
      } catch (createError) {
        console.error('[useChatSession] Failed to create new session:', createError);
      }
    }
  };

  // Convert session messages to display format
  const sessionMessages = Array.isArray(currentSession?.messages) ? currentSession.messages : [];
  const displayMessages = sessionMessages.map(m => ({
    id: m.id,
    role: m.sender === 'researcher' ? 'assistant' : m.sender === 'ai' ? 'assistant' : m.sender,
    content: m.content,
    metadata: m.metadata,
  })) || [];

  const isWaitingForResearcher = isResearcherControlled && currentSession?.status === 'waiting';
  const isAILoading = !isResearcherControlled && (isLoading || currentSession?.isAIResponding === true);

  // Extract conversation text for generation
  const getConversationText = () => {
    return displayMessages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
  };

  // Formalize problem from user side
  const formalizeProblem = async () => {
    if (!currentSession || !apiKey) return;

    try {
      await executeFormalization({
        sessionId: currentSession.id,
        apiKey,
        model: model || 'gemini-2.0-flash',
        messages: currentSession.messages,
        sessionManager,
      });
    } catch (error) {
      console.error('[useChatSession] Formalization error:', error);
      throw error;
    }
  };

  // Reset formalization to allow re-formalization
  const resetFormalization = async () => {
    if (!currentSession) return;

    // Reset status to active and clear readyToFormalize
    await sessionManager.updateSession(currentSession.id, {
      status: 'active',
      readyToFormalize: false
    });
  };

  return {
    // State
    input,
    setInput,
    currentSession,
    mode,
    displayMessages,
    isLoading: isAILoading,
    isWaitingForResearcher,
    sessionTerminated,
    apiKey,
    provider,
    model,

    // Actions
    handleSubmit,
    getConversationText,
    formalizeProblem,
    resetFormalization,
  };
}
