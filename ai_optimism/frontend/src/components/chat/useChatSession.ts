'use client';

import { useEffect, useState, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { sessionManager, Session, SessionMode } from '../../services/sessionManager';
import { useAIProvider } from '../../contexts/AIProviderContext';
import { executeFormalization, detectFormalizationReadiness } from '../../services/formalizationHelper';

export function useChatSession() {
  const { state } = useAIProvider();
  const { apiKey, provider, model } = state;
  
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

  // Initialize or load session on mount
  useEffect(() => {
    let session = sessionManager.getCurrentSession();
    
    // Always ensure there's a session
    if (!session || session.status === 'completed') {
      if (session?.status === 'completed') {
        showTerminationNotification();
      }
      // Create session in experimental mode so researchers can always see it
      session = sessionManager.createSession('experimental');
      // Explicitly ensure new session starts fresh
      sessionManager.updateSession(session.id, { status: 'active' });
      console.log('[useChatSession] Created new experimental session:', session.id);
    }
    
    setCurrentSession(session);
    
    // Subscribe to session updates
    let currentUnsubscribe: (() => void) | null = null;
    
    const subscribeToCurrentSession = (sessionId: string) => {
      // Clean up previous subscription if it exists
      if (currentUnsubscribe) {
        currentUnsubscribe();
      }
      
      currentUnsubscribe = sessionManager.subscribeToSession(sessionId, (updatedSession) => {
        if (updatedSession.status === 'completed') {
          showTerminationNotification();
          const newSession = sessionManager.createSession('ai');
          console.log('[useChatSession] Session terminated, created new session:', newSession.id);
          
          // Explicitly ensure new session starts with active status (not waiting)
          sessionManager.updateSession(newSession.id, { status: 'active' });
          setCurrentSession(newSession);
          
          // Restart subscription for new session
          subscribeToCurrentSession(newSession.id);
        } else {
          setCurrentSession(updatedSession);
        }
      });
    };
    
    subscribeToCurrentSession(session.id);
    
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

  // Use session ID as chat ID to ensure each session has separate message history
  // This prevents messages from old sessions appearing in new sessions
  const chatId = currentSession ? `chat-${currentSession.id}` : 'chat-disconnected';
  
  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    transport,
  });
  
  const isLoading = status === 'streaming' || status === 'submitted';

  // Initialize AI greeting for new AI-mode sessions
  useEffect(() => {
    if (!currentSession || !apiKey || isResearcherControlled) return;
    
    // Check if session has no messages and useChat has no messages
    if (currentSession.messages.length === 0 && messages.length === 0 && !isLoading) {
      console.log('[useChatSession] Initializing AI greeting for new session');
      
      // Send an initialization prompt to get the AI's greeting
      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: 'Initialize' }],
      });
    }
  }, [currentSession?.id, apiKey, isResearcherControlled, messages.length, isLoading]);

  // Log errors (but suppress API key errors when not connected)
  useEffect(() => {
    if (error && apiKey) {
      console.error('[ChatPanel] Chat error:', error);
    }
  }, [error, apiKey]);

  // Save AI responses to session when they complete
  useEffect(() => {
    if (!isResearcherControlled && currentSession && messages.length > 0 && status !== 'streaming') {
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage.role === 'assistant') {
        const text = lastMessage.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || '';
        
        // Check if this message is already in session to avoid duplicates
        const existingMessage = currentSession.messages.find(m => 
          m.sender === 'ai' && m.content === text
        );
        
        if (text.trim() && !existingMessage) {
          // Get fresh session data from storage to check user message count
          const freshSession = sessionManager.getSession(currentSession.id);
          const userMessageCount = freshSession?.messages.filter(m => m.sender === 'user').length || 0;
          
          console.log('[useChatSession] Saving AI message, userMessageCount:', userMessageCount);
          sessionManager.addMessage(currentSession.id, 'ai', text);
          
          // Only check for formalization readiness if there are actual user messages
          // This prevents the initialization greeting from triggering readiness detection
          if (userMessageCount > 0) {
            // Check for formalization readiness signals
            const { isReady, suggestsReformalizing, acknowledgesRestart } = detectFormalizationReadiness(text);
            
            if (isReady && currentSession.status !== 'formalized') {
              console.log('[useChatSession] AI indicated readiness to formalize');
              sessionManager.updateSession(currentSession.id, { status: 'waiting' });
            } else if ((suggestsReformalizing || acknowledgesRestart) && currentSession.status === 'formalized') {
              console.log('[useChatSession] AI suggests re-formalization, resetting status');
              sessionManager.updateSession(currentSession.id, { status: 'active' });
            }
          } else {
            console.log('[useChatSession] Skipping readiness check - no user messages yet');
          }
        }
      }
    }
  }, [messages, status, currentSession, isResearcherControlled]);

  // Handle message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentSession) return;
    
    // Always save user message to session
    sessionManager.addMessage(currentSession.id, 'user', input);
    
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
      setInput('');
    }
  };

  // Convert session messages to display format
  const displayMessages = currentSession?.messages.map(m => ({
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
      });
    } catch (error) {
      console.error('[useChatSession] Formalization error:', error);
      throw error;
    }
  };

  // Reset formalization to allow re-formalization
  const resetFormalization = () => {
    if (!currentSession) return;
    sessionManager.updateSession(currentSession.id, { status: 'active' });
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
