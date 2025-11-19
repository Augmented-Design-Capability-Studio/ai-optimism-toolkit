'use client';

import { useEffect, useState, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { sessionManager, Session, SessionMode } from '../../services/sessionManager';
import { useAIProvider } from '../../contexts/AIProviderContext';
import { getFormalizationPrompt, isIncompleteFormalization } from '../../config/prompts';

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

  // Initialize or load session on mount
  useEffect(() => {
    let session = sessionManager.getCurrentSession();
    
    // Always ensure there's a session
    if (!session || session.status === 'completed') {
      // If session was completed (terminated), show message to user
      if (session?.status === 'completed') {
        setSessionTerminated(true);
        setTimeout(() => setSessionTerminated(false), 5000);
      }
      // Create a new session that starts in AI mode
      session = sessionManager.createSession('ai');
      console.log('[useChatSession] Created new session:', session.id);
    }
    
    setCurrentSession(session);
    
    // Subscribe to session updates
    const unsubscribe = sessionManager.subscribeToSession(session.id, (updatedSession) => {
      // If session is terminated, create a new one
      if (updatedSession.status === 'completed') {
        setSessionTerminated(true);
        setTimeout(() => setSessionTerminated(false), 5000);
        
        // Create new session and update
        const newSession = sessionManager.createSession('ai');
        console.log('[useChatSession] Session terminated, created new session:', newSession.id);
        setCurrentSession(newSession);
        
        // Restart subscription for new session
        unsubscribe();
        sessionManager.subscribeToSession(newSession.id, (newUpdatedSession) => {
          setCurrentSession(newUpdatedSession);
        });
      } else {
        setCurrentSession(updatedSession);
      }
    });
    
    return unsubscribe;
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

  // Use useChat with custom transport
  const chatId = apiKey ? 'optimization-chat' : 'optimization-chat-disconnected';
  
  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    transport,
  });
  
  const isLoading = status === 'streaming' || status === 'submitted';

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
          sessionManager.addMessage(currentSession.id, 'ai', text);
          
          const lowerText = text.toLowerCase();
          
          // Check if AI explicitly indicates readiness to formalize
          // Looking for strong signals like "enough information" or "ready to formalize"
          const explicitlyReady = (
            (lowerText.includes('enough information') || lowerText.includes('ready to formalize') ||
             lowerText.includes('can now formalize') || lowerText.includes('sufficient information')) &&
            (lowerText.includes('formalize') || lowerText.includes('formalise'))
          );
          
          // Check if AI asks if user wants to formalize
          const asksToFormalize = (
            (lowerText.includes('would you like') || lowerText.includes('shall i') || 
             lowerText.includes('should i') || lowerText.includes('want me to')) &&
            (lowerText.includes('formalize') || lowerText.includes('formalise') || 
             lowerText.includes('structured') || lowerText.includes('problem definition'))
          );
          
          // Check if AI is suggesting re-formalization
          const suggestsReformalizing = (
            (lowerText.includes('re-formalize') || lowerText.includes('refine') || lowerText.includes('update')) &&
            (lowerText.includes('problem') || lowerText.includes('definition'))
          );
          
          // Check if AI acknowledges new problem or restart
          const acknowledgesRestart = (
            lowerText.includes('start fresh') ||
            lowerText.includes('new problem') ||
            lowerText.includes('different problem') ||
            lowerText.includes('moving on') ||
            lowerText.includes("let's start") ||
            lowerText.includes("let's begin") ||
            (lowerText.includes('starting') && (lowerText.includes('over') || lowerText.includes('fresh')))
          );
          
          if ((explicitlyReady || asksToFormalize) && currentSession.status !== 'formalized') {
            console.log('[useChatSession] AI indicated readiness to formalize');
            // Update session to indicate formalization is ready
            sessionManager.updateSession(currentSession.id, { status: 'waiting' });
          } else if ((suggestsReformalizing || acknowledgesRestart) && currentSession.status === 'formalized') {
            console.log('[useChatSession] AI suggests re-formalization or acknowledges restart, resetting status');
            // Reset status to allow re-formalization
            sessionManager.updateSession(currentSession.id, { status: 'active' });
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
      const { streamText } = await import('ai');
      const { createGoogleGenerativeAI } = await import('@ai-sdk/google');

      const google = createGoogleGenerativeAI({ apiKey });
      const aiModel = google(model || 'gemini-2.0-flash');

      const conversationContext = currentSession.messages
        .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');

      const formalizationPrompt = getFormalizationPrompt(conversationContext);

      const result = await streamText({
        model: aiModel,
        messages: [{ role: 'user', content: formalizationPrompt }],
      });

      let formalizedText = '';
      for await (const textPart of result.textStream) {
        formalizedText += textPart;
      }

      if (formalizedText.trim()) {
        // Check if formalization was incomplete
        const incomplete = isIncompleteFormalization(formalizedText);
        
        if (incomplete) {
          // Add as AI message with incomplete metadata for special styling
          sessionManager.addMessage(currentSession.id, 'ai', formalizedText, {
            type: 'formalization',
            incomplete: true,
          });
          // Don't change status - keep it as active to allow more conversation
        } else {
          sessionManager.addMessage(currentSession.id, 'ai', formalizedText, {
            type: 'formalization',
          });
          sessionManager.updateSession(currentSession.id, { status: 'formalized' });
        }
      }
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
