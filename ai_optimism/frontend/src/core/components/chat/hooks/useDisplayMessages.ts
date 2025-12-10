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
    // Only show streaming messages when actively streaming
    // Once streaming completes (status !== 'streaming'), these should be empty
    // and the saved backend message will be shown instead
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
    
    // Only process streaming messages if status is actually 'streaming'
    // This prevents showing streaming messages after streaming completes
    const activeStreamingMessages = status === 'streaming' ? streamingMessages : [];
    
    // Filter out streaming messages that have been saved to backend
    // Check both by ID (if streaming message has an ID that matches backend) and by content
    const uniqueStreamingMessages = activeStreamingMessages.filter((streamMsg) => {
      // First check if streaming message ID exists in backend (most reliable)
      if (streamMsg.id && backendMessageIds.has(streamMsg.id)) {
        return false; // Already in backend, skip
      }
      
      // Then check by content match (for cases where IDs differ but content is the same)
      // Normalize content for comparison (trim and handle empty strings)
      const streamContent = (streamMsg.content || '').trim();
      if (!streamContent) {
        // Empty streaming message, keep it (might still be streaming)
        return true;
      }
      
      // Check if any backend message matches this streaming message
      // Check most recent backend messages first (they're more likely to be the saved version)
      const recentBackendMessages = [...sessionDisplayMessages]
        .filter(m => m.role === 'assistant')
        .reverse(); // Most recent first
      
      const existsInBackend = recentBackendMessages.some(
        (backendMsg) => {
          const backendContent = (backendMsg.content || '').trim();
          
          // Exact match - definitely the same message
          if (backendContent === streamContent) {
            return true;
          }
          
          // Backend message is longer and starts with streaming content
          // This means backend has the complete version of what's still streaming
          // Only match if streaming content is substantial (avoid matching partial words)
          if (streamContent.length > 20 && 
              backendContent.length >= streamContent.length && 
              backendContent.startsWith(streamContent)) {
            return true;
          }
          
          // Also check if backend content is very similar (handles minor whitespace differences)
          // Remove all whitespace and compare (more lenient matching)
          const streamNormalized = streamContent.replace(/\s+/g, ' ');
          const backendNormalized = backendContent.replace(/\s+/g, ' ');
          if (streamNormalized.length > 20 && 
              backendNormalized.includes(streamNormalized) &&
              Math.abs(backendNormalized.length - streamNormalized.length) < 50) {
            return true;
          }
          
          return false;
        }
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

