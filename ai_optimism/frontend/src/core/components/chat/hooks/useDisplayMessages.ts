import { useEffect, useState, useMemo } from 'react';
import { Session } from '@/core/services/sessionManager';
import { extractMessageText } from '../utils/messageConverters';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: any;
}

interface UseDisplayMessagesProps {
  currentSession: Session | null;
  isResearcherControlled: boolean;
  messages: any[];
  status: string;
}

export function useDisplayMessages({
  currentSession,
  isResearcherControlled,
  messages,
  status,
}: UseDisplayMessagesProps) {
  const [optimisticMessages, setOptimisticMessages] = useState<
    Map<
      string,
      {
        content: string;
        timestamp: number;
      }
    >
  >(new Map());

  const sessionMessages = Array.isArray(currentSession?.messages)
    ? currentSession.messages
    : [];

  const sessionDisplayMessages = useMemo(() => {
    return sessionMessages.map((m) => ({
      id: m.id,
      role:
        m.sender === 'researcher'
          ? 'assistant'
          : m.sender === 'ai'
          ? 'assistant'
          : m.sender,
      content: m.content,
      metadata: m.metadata,
    }));
  }, [sessionMessages]);

  const streamingMessages = useMemo(() => {
    if (isResearcherControlled || !status || status !== 'streaming') {
      return [];
    }

    return messages
      .filter((msg: any) => msg.role === 'assistant')
      .map((msg: any) => {
        const content = extractMessageText(msg);
        return {
          id: msg.id || `streaming-${Date.now()}`,
          role: 'assistant' as const,
          content,
          parts: msg.parts,
          metadata: { ...msg.metadata, streaming: true } as any,
        };
      });
  }, [messages, status, isResearcherControlled]);

  const confirmedUserMessages = useMemo(
    () =>
      new Set(
        sessionDisplayMessages
          .filter((m) => m.role === 'user')
          .map((m) => m.content.trim())
      ),
    [sessionDisplayMessages]
  );

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
    const backendMessageIds = new Set(sessionDisplayMessages.map((m) => m.id));
    const uniqueStreamingMessages = streamingMessages.filter((streamMsg) => {
      const existsInBackend = sessionDisplayMessages.some(
        (backendMsg) =>
          backendMsg.role === 'assistant' &&
          backendMsg.content.trim() === streamMsg.content.trim()
      );
      return !existsInBackend;
    });

    const all = [
      ...sessionDisplayMessages,
      ...uniqueStreamingMessages,
      ...optimisticDisplayMessages,
    ];
    
    // Filter out "Generating optimization controls..." messages completely
    // We don't show these - only show success/error messages
    const filtered = all.filter((m) => {
      // Remove all "Generating optimization controls..." messages
      if (
        m.metadata?.type === 'controls-generation' &&
        m.content?.includes('Generating optimization controls')
      ) {
        return false;
      }
      return true;
    });
    
    // Create a timestamp map for O(1) lookup instead of O(n) find() calls
    const timestampMap = new Map<string, number>();
    sessionMessages.forEach(m => {
      timestampMap.set(m.id, m.timestamp);
    });
    
    return filtered.sort((a, b) => {
      const aMeta = a.metadata as any;
      const bMeta = b.metadata as any;
      const aTime = aMeta?.timestamp || timestampMap.get(a.id) || 0;
      const bTime = bMeta?.timestamp || timestampMap.get(b.id) || 0;
      return aTime - bTime;
    });
  }, [
    sessionDisplayMessages,
    streamingMessages,
    optimisticDisplayMessages,
    sessionMessages,
  ]);

  useEffect(() => {
    setOptimisticMessages((prev) => {
      if (prev.size === 0) return prev;

      const confirmed = new Set(
        sessionMessages
          .filter((m) => m.sender === 'user')
          .map((m) => m.content.trim())
      );

      const newMap = new Map(prev);
      let changed = false;

      for (const [id, opt] of newMap.entries()) {
        if (
          confirmed.has(opt.content.trim()) ||
          Date.now() - opt.timestamp > 10000
        ) {
          newMap.delete(id);
          changed = true;
        }
      }

      return changed ? newMap : prev;
    });
  }, [sessionMessages]);

  return {
    displayMessages,
    optimisticMessages,
    setOptimisticMessages,
  };
}

