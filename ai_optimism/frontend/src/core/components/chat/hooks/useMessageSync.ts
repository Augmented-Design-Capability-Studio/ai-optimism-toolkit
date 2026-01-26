import { useEffect, useRef } from 'react';
import { Session, Message } from '@/core/services/sessionManager';
import { convertToUseChatMessages } from '../utils/messageConverters';
import { getRealUserMessageCount } from '../utils/sessionHelpers';
import { detectFormalizationReadiness } from '@/core/services/formalizationHelper';
import { parseStructuredData, getUpdateType } from '@/core/utils/structuredDataParser';
import { parseAnalysisBlock } from '@/core/utils/analysisParser';
import { parseDataBlock } from '@/core/utils/dataParser';

interface UseMessageSyncProps {
  currentSession: Session | null;
  isResearcherControlled: boolean;
  messages: any[];
  setMessages: ((messages: any[]) => void) | undefined;
  isLoading: boolean;
  status: string;
  sendMessage: (message: { role: 'user'; parts: Array<{ type: 'text'; text: string }> }) => void;
  sessionManager: any;
}

export function useMessageSync({
  currentSession,
  isResearcherControlled,
  messages,
  setMessages,
  isLoading,
  status,
  sendMessage,
  sessionManager,
}: UseMessageSyncProps) {
  const initializedRef = useRef<string | null>(null);
  const initializingRef = useRef(false);

  // Initialize useChat with backend messages
  useEffect(() => {
    if (isResearcherControlled || !currentSession || !setMessages) {
      return;
    }

    if (isLoading || initializingRef.current) {
      return;
    }

    const initKey = currentSession.id;
    if (initializedRef.current === initKey && messages.length > 0) {
      return;
    }

    const sessionMessages = Array.isArray(currentSession.messages)
      ? currentSession.messages
      : [];
    const backendChatMessages = convertToUseChatMessages(sessionMessages);

    if (messages.length === 0 && backendChatMessages.length > 0) {
      initializingRef.current = true;
      setMessages(backendChatMessages);
      initializedRef.current = initKey;
      initializingRef.current = false;
    } else if (messages.length === 0 && backendChatMessages.length === 0) {
      // Empty session - just mark as initialized, WelcomeMessage component handles the welcome UI
      initializedRef.current = initKey;
    } else if (backendChatMessages.length > messages.length && !isLoading) {
      initializingRef.current = true;
      setMessages(backendChatMessages);
      initializingRef.current = false;
    }
  }, [
    currentSession?.id,
    currentSession?.messages,
    isResearcherControlled,
    setMessages,
    status,
    messages.length,
    isLoading,
  ]);

  // Sync useChat with backend AI messages from researcher
  useEffect(() => {
    if (
      isResearcherControlled ||
      !currentSession ||
      !setMessages ||
      isLoading ||
      initializingRef.current
    ) {
      return;
    }

    const sessionMessages = Array.isArray(currentSession.messages)
      ? currentSession.messages
      : [];
    const backendChatMessages = convertToUseChatMessages(sessionMessages);

    const useChatMessageIds = new Set(messages.map((m: any) => m.id));
    const backendAIMessages = backendChatMessages.filter(
      (m) => m.role === 'assistant'
    );
    const useChatAIMessages = messages.filter(
      (m: any) => m.role === 'assistant'
    );

    const backendHasNewAIMessages = backendAIMessages.some(
      (backendMsg) => !useChatMessageIds.has(backendMsg.id)
    );

    if (
      backendHasNewAIMessages &&
      backendAIMessages.length > useChatAIMessages.length
    ) {
      setMessages(backendChatMessages);
    }
  }, [
    currentSession?.messages,
    isResearcherControlled,
    setMessages,
    status,
    messages,
    isLoading,
  ]);

  // Save AI responses to session
  useEffect(() => {
    if (
      isResearcherControlled ||
      !currentSession ||
      messages.length === 0 ||
      status === 'streaming'
    ) {
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'assistant') return;

    const text =
      lastMessage.parts
        ?.filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('') || '';

    if (!text.trim()) {
      return;
    }

    const sessionMessages = Array.isArray(currentSession.messages)
      ? currentSession.messages
      : [];
    const exists = sessionMessages.some(
      (m) => m.sender === 'ai' && m.content === text
    );
    if (exists) return;

    const saveResponse = async () => {
      try {
        const freshSession = await sessionManager.getSession(currentSession.id);
        if (!freshSession) return;

        // Parse structured data from AI response
        const structuredData = parseStructuredData(text);
        const updateType = structuredData ? getUpdateType(structuredData) : null;
        const analysis = parseAnalysisBlock(text);
        const dataPayload = parseDataBlock(text);

        // Prepare metadata
        const metadata: Message['metadata'] | undefined =
          updateType || analysis || dataPayload
            ? {
                ...(updateType
                  ? {
                      type: updateType as
                        | 'variables-update'
                        | 'objectives-update'
                        | 'constraints-update'
                        | 'properties-update',
                      structuredData,
                    }
                  : {}),
                ...(analysis ? { analysis } : {}),
                ...(dataPayload ? { dataPayload } : {}),
              }
            : undefined;

        await sessionManager.addMessage(currentSession.id, 'ai', text, metadata);

        if (currentSession.status === 'waiting') {
          await sessionManager.updateSession(currentSession.id, {
            status: 'active',
          });
        }

        const freshMessages = Array.isArray(freshSession.messages)
          ? freshSession.messages
          : [];
        const realUserMessages = getRealUserMessageCount(freshMessages);

        if (realUserMessages > 0) {
          const {
            isReady,
            suggestsReformalizing,
            acknowledgesRestart,
          } = detectFormalizationReadiness(text);
          if (isReady && currentSession.status !== 'formalized') {
            await sessionManager.updateSession(currentSession.id, {
              readyToFormalize: true,
            });
          } else if (
            (suggestsReformalizing || acknowledgesRestart) &&
            currentSession.status === 'formalized'
          ) {
            await sessionManager.updateSession(currentSession.id, {
              status: 'active',
              readyToFormalize: false,
            });
          }
        }
      } catch (error) {
        console.error('[useMessageSync] Error saving AI response:', error);
      }
    };

    saveResponse();
  }, [messages, status, currentSession, isResearcherControlled, sessionManager]);

  // Check researcher messages for formalization readiness
  useEffect(() => {
    if (!isResearcherControlled || !currentSession) return;

    const check = async () => {
      try {
        const freshSession = await sessionManager.getSession(currentSession.id);
        if (!freshSession) return;

        const freshMessages = Array.isArray(freshSession.messages)
          ? freshSession.messages
          : [];
        const realUserMessages = getRealUserMessageCount(freshMessages);

        if (realUserMessages > 0 && freshSession.status !== 'formalized') {
          const lastResearcherMessage = [...freshMessages]
            .reverse()
            .find((m: Message) => m.sender === 'researcher');

          if (lastResearcherMessage) {
            const { isReady } = detectFormalizationReadiness(
              lastResearcherMessage.content
            );
            if (isReady && !freshSession.readyToFormalize) {
              await sessionManager.updateSession(currentSession.id, {
                readyToFormalize: true,
              });
            }
          }
        }
      } catch (error) {
        console.error(
          '[useMessageSync] Error checking researcher messages:',
          error
        );
      }
    };

    if (currentSession?.updatedAt) {
      check();
    }
  }, [
    currentSession?.updatedAt,
    currentSession?.id,
    isResearcherControlled,
    sessionManager,
  ]);

  return { initializedRef, initializingRef };
}

