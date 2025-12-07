'use client';

import { useState, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { useSessionManager, SessionMode } from '../../../core/services/sessionManager';
import { useBackend } from '../../../core/contexts/BackendContext';
import { useSessionLifecycle } from '../../../core/components/chat/hooks/useSessionLifecycle';
import { useChatTransport } from '../../../core/components/chat/hooks/useChatTransport';
import { useMessageSync } from '../../../core/components/chat/hooks/useMessageSync';
import { useDisplayMessages } from '../../../core/components/chat/hooks/useDisplayMessages';

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
  const [sessionModel, setSessionModel] = useState<string>('gemini-2.5-flash');

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

  const { displayMessages } = useDisplayMessages({
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

    if (!isResearcherControlledMode) {
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
    apiKey,
    provider: effectiveProvider,
    model: effectiveModel,
    handleSubmit,
    getConversationText,
    createNewSession,
  };
}

