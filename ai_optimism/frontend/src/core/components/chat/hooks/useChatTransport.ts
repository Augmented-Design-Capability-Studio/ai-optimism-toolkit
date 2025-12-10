import { useMemo } from 'react';
import { DefaultChatTransport } from 'ai';
import { Session } from '@/core/services/sessionManager';

interface UseChatTransportProps {
  currentSession: Session | null;
  provider?: string;
  model?: string;
}

export function useChatTransport({
  currentSession,
  provider = 'google',
  model = 'gemini-2.5-flash-lite',
}: UseChatTransportProps) {
  const transport = useMemo(() => {
    if (!currentSession?.id) {
      return new DefaultChatTransport({
        api: '/api/chat',
        body: {
          sessionId: '',
          provider,
          model,
        },
      });
    }

    return new DefaultChatTransport({
      api: '/api/chat',
      body: {
        sessionId: currentSession.id,
        provider,
        model,
      },
    });
  }, [currentSession?.id, provider, model]);

  const chatId = currentSession
    ? `chat-${currentSession.id}`
    : 'chat-disconnected';

  return { transport, chatId };
}



