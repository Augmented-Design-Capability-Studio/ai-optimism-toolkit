'use client';

import { useState, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { useSessionManager, SessionMode } from '@/core/services/sessionManager';
import { useBackend } from '@/core/contexts/BackendContext';
import { useSessionLifecycle } from '@/core/components/chat/hooks/useSessionLifecycle';
import { useChatTransport } from '@/core/components/chat/hooks/useChatTransport';
import { useMessageSync } from '@/core/components/chat/hooks/useMessageSync';
import { useDisplayMessages } from '@/core/components/chat/hooks/useDisplayMessages';
import { convertToUseChatMessages } from '@/core/components/chat/utils/messageConverters';

export function useChatSession() {
  const { state: backendState } = useBackend();
  const sessionManager = useSessionManager();

  const {
    currentSession,
    setCurrentSession,
    sessionDeleted,
    setSessionDeleted,
    sessionTerminated,
    setSessionTerminated,
    isCreatingSession,
    createNewSession,
  } = useSessionLifecycle();

  const inputRef = useRef('');
  const clearCounterRef = useRef(0);
  const [clearCounter, setClearCounter] = useState(0);
  
  const setInput = (value: string) => {
    inputRef.current = value;
    if (value === '') {
      clearCounterRef.current += 1;
      setClearCounter(clearCounterRef.current);
    }
  };
  
  const input = clearCounter;
  const [sessionProvider, setSessionProvider] = useState<string>('google');
  const [sessionModel, setSessionModel] = useState<string>('gemini-2.5-flash-lite');

  // apiKey, provider, and model are not available in BackendContext
  // Using local state values instead
  const apiKey: string | null = null;
  const effectiveProvider = sessionProvider;
  const effectiveModel = sessionModel;

  const { transport, chatId } = useChatTransport({
    currentSession,
    provider: effectiveProvider,
    model: effectiveModel,
  });

  const { messages, setMessages, status, sendMessage } = useChat({
    id: chatId,
    transport,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const mode = (currentSession?.mode as SessionMode) || 'experimental';
  const isResearcherControlledMode = mode === 'experimental';

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

  const { displayMessages, setOptimisticMessages } = useDisplayMessages({
    currentSession,
    isResearcherControlled: isResearcherControlledMode,
    messages,
    status,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      try {
        const updatedSession = await sessionManager.getSession(currentSession.id);
        if (updatedSession) {
          setCurrentSession(updatedSession);
        }
      } catch (error) {
        console.warn('[useChatSession] Could not refresh session after sending message:', error);
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
    isCreatingSession,
    apiKey,
    provider: effectiveProvider,
    model: effectiveModel,
    handleSubmit,
    getConversationText,
    createNewSession,
  };
}

