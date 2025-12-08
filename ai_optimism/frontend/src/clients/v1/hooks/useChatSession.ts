'use client';

import { useState, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { useSessionManager, SessionMode } from '@/core/services/sessionManager';
import { useBackend } from '@/core/contexts/BackendContext';
import { useSessionLifecycle } from '@/core/components/chat/hooks/useSessionLifecycle';
import { useChatTransport } from '@/core/components/chat/hooks/useChatTransport';
import { useMessageSync } from '@/core/components/chat/hooks/useMessageSync';
import { useDisplayMessages } from '@/core/components/chat/hooks/useDisplayMessages';
import { useFormalization } from '@/core/components/chat/hooks/useFormalization';
import { isResearcherControlled } from '@/core/components/chat/utils/sessionHelpers';
import { convertToUseChatMessages } from '@/core/components/chat/utils/messageConverters';

export function useChatSession() {
  const { state: backendState } = useBackend();
  const sessionManager = useSessionManager();

  // Use ref for input to avoid causing re-renders in parent components
  // We expose a setter that updates the ref, but don't use state to avoid re-renders
  const inputRef = useRef('');
  const clearCounterRef = useRef(0);
  const [clearCounter, setClearCounter] = useState(0);
  
  const setInput = (value: string) => {
    inputRef.current = value;
    // When clearing, increment counter to signal ChatInput to reset
    if (value === '') {
      clearCounterRef.current += 1;
      setClearCounter(clearCounterRef.current);
    }
  };
  
  // Expose clear counter as "input" prop - ChatInput will reset when this changes
  // This avoids re-renders on every keystroke while still allowing reset after submit
  const input = clearCounter;
  const [sessionProvider, setSessionProvider] = useState<string>('google');
  const [sessionModel, setSessionModel] = useState<string>('gemini-2.5-flash');

  const {
    currentSession,
    setCurrentSession,
    sessionDeleted,
    setSessionDeleted,
    sessionTerminated,
    setSessionTerminated,
    createNewSession,
  } = useSessionLifecycle();

  const mode: SessionMode = currentSession?.mode || 'ai';
  const isResearcherControlledMode = isResearcherControlled(currentSession);

  const { transport, chatId } = useChatTransport({
    currentSession,
    provider: sessionProvider,
    model: sessionModel,
  });

  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: chatId,
    transport,
    onError: (error) => {
      console.error('[useChatSession] Chat error:', error);
      
      // Check if this is a quota error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isQuotaError = 
        errorMessage.includes('quota') ||
        errorMessage.includes('Quota exceeded') ||
        errorMessage.includes('QUOTA_EXCEEDED') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('429');
      
      if (isQuotaError) {
        // Show user-friendly error message
        alert(
          'API quota exceeded. Please wait a minute before sending another message.\n\n' +
          'Your request limit is 5 requests per minute. Each failed request may retry multiple times, ' +
          'so please wait at least 12 seconds between messages to avoid hitting the limit.'
        );
      }
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  useMessageSync({
    currentSession,
    isResearcherControlled: isResearcherControlledMode,
    messages,
    setMessages,
    isLoading,
    status,
    sendMessage,
    sessionManager,
  });

  const { displayMessages, optimisticMessages, setOptimisticMessages } =
    useDisplayMessages({
      currentSession,
      isResearcherControlled: isResearcherControlledMode,
      messages,
      status,
    });

  const { formalizeProblem, resetFormalization } = useFormalization({
    currentSession,
    sessionManager,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Read from ref to avoid dependency on state
    const currentInput = inputRef.current;
    if (!currentInput.trim() || !currentSession?.id) {
      if (sessionDeleted) {
        alert('Your session has been deleted. Please create a new session.');
      }
      return;
    }

    const userMessageText = currentInput.trim();
    inputRef.current = '';
    setInput('');

    const optimisticId = `optimistic-${Date.now()}-${Math.random()}`;
    const optimisticTimestamp = Date.now();
    setOptimisticMessages((prev) => {
      const newMap = new Map(prev);
      newMap.set(optimisticId, {
        content: userMessageText,
        timestamp: optimisticTimestamp,
      });
      return newMap;
    });

    try {
      const message = await sessionManager.addMessage(
        currentSession.id,
        'user',
        userMessageText
      );

      if (!message) {
        setSessionDeleted(true);
        setCurrentSession(null);
        setOptimisticMessages((prev) => {
          const newMap = new Map(prev);
          newMap.delete(optimisticId);
          return newMap;
        });
        return;
      }

      // Immediately refresh session to get the new message (for immediate display)
      // This ensures the message appears right away without waiting for subscription poll
      try {
        const updatedSession = await sessionManager.getSession(currentSession.id);
        if (updatedSession) {
          setCurrentSession(updatedSession);
        }
      } catch (error) {
        // Ignore errors - subscription will pick it up
        console.warn('[useChatSession] Could not immediately refresh session after sending message:', error);
      }

      if (!isResearcherControlledMode) {
        const sessionMessages = Array.isArray(currentSession.messages)
          ? currentSession.messages
          : [];
        const backendChatMessages = convertToUseChatMessages(sessionMessages);

        const useChatMessageIds = new Set(messages.map((m: any) => m.id));
        const needsSync =
          backendChatMessages.length > messages.length ||
          backendChatMessages.some((m: any) => !useChatMessageIds.has(m.id));

        if (needsSync && setMessages) {
          setMessages(backendChatMessages);
          // No delay - update immediately for responsive UI
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
      setOptimisticMessages((prev) => {
        const newMap = new Map(prev);
        newMap.delete(optimisticId);
        return newMap;
      });

      console.error('[useChatSession] Error submitting message:', error);

      const errorMessage = String((error as any)?.message || '');
      if (
        errorMessage.includes('404') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('deleted')
      ) {
        setSessionDeleted(true);
        setCurrentSession(null);
      }
    }
  };

  const isWaitingForResearcher =
    isResearcherControlledMode && currentSession?.status === 'waiting';
  const isAILoading =
    !isResearcherControlledMode &&
    (isLoading || currentSession?.isAIResponding === true);

  const getConversationText = () => {
    return displayMessages.map((m) => `${m.role}: ${m.content}`).join('\n');
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
    apiKey: '', // No longer used, kept for backward compatibility
    provider: sessionProvider,
    model: sessionModel,
    handleSubmit,
    getConversationText,
    formalizeProblem,
    resetFormalization,
    createNewSession,
  };
}
