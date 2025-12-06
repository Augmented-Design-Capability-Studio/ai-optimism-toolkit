'use client';

import { Paper, Alert, Box, Typography, Button } from '@mui/material';
import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChatHeader,
  MessagesList,
  ChatInput,
} from '../../../core/components/chat';
import { FormalizeButton } from '../components/FormalizeButton';
import { GenerateControlsButton } from '../components/GenerateControlsButton';
import { useChatSession } from '../hooks/useChatSession';
import { useSessionManager } from '../../../core/services/sessionManager';
import type { Message } from '../../../core/services/sessionManager';
import { aggregateControlsFromMessages } from '../services/controlsAggregator';

interface ChatPanelProps {
  onControlsGenerated?: (controls: unknown) => void;
}

export function ChatPanel({ onControlsGenerated }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFormalizing, setIsFormalizing] = useState(false);
  // Track locally completed messages (when backend update fails)
  // Use localStorage keyed by session ID to persist across refreshes
  const getLocalStorageKey = (sessionId: string) => `controls_completed_${sessionId}`;
  const [locallyCompletedMessages, setLocallyCompletedMessages] = useState<Set<string>>(new Set());
  const sessionManager = useSessionManager();

  const {
    input,
    setInput,
    currentSession,
    mode,
    displayMessages,
    isLoading,
    isWaitingForResearcher,
    sessionTerminated,
    sessionDeleted,
    apiKey,
    provider,
    model,
    handleSubmit,
    getConversationText,
    formalizeProblem,
    resetFormalization,
    createNewSession,
  } = useChatSession();

  // Restore locally completed messages from localStorage on mount or session change
  useEffect(() => {
    if (!currentSession?.id) {
      // Clear completed messages when no session
      setLocallyCompletedMessages(new Set());
      return;
    }
    
    const storageKey = getLocalStorageKey(currentSession.id);
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const completedIds = JSON.parse(stored) as string[];
        if (Array.isArray(completedIds) && completedIds.length > 0) {
          // Verify these message IDs still exist in the session and are controls-generation messages
          const sessionMessageIds = new Set(
            currentSession.messages
              ?.filter((m: Message) => 
                m.metadata?.type === 'controls-generation'
              )
              .map((m: Message) => m.id) || []
          );
          
          // Only restore IDs that:
          // 1. Still exist in the session
          // 2. Are controls-generation messages
          // 3. Either don't have controlsGenerated flag OR have it as false
          const validIds = completedIds.filter(id => {
            if (!sessionMessageIds.has(id)) return false;
            const msg = currentSession.messages?.find((m: Message) => m.id === id);
            // Restore if message doesn't have controlsGenerated flag set to true (backend update failed)
            return msg && (!msg.metadata?.controlsGenerated);
          });
          
          if (validIds.length > 0) {
            setLocallyCompletedMessages(new Set(validIds));
            console.log('[ChatPanel] Restored locally completed messages from localStorage:', validIds);
            // Update localStorage to remove any stale IDs
            if (validIds.length !== completedIds.length) {
              localStorage.setItem(storageKey, JSON.stringify(validIds));
            }
          } else {
            // Clear localStorage if no valid IDs
            localStorage.removeItem(storageKey);
          }
        }
      }
    } catch (error) {
      console.error('[ChatPanel] Failed to restore locally completed messages:', error);
    }
  }, [currentSession?.id, currentSession?.messages]);

  // Aggregate controls from messages and pass to parent
  // Use refs to prevent infinite loops
  const onControlsGeneratedRef = useRef(onControlsGenerated);

  useEffect(() => {
    onControlsGeneratedRef.current = onControlsGenerated;
  }, [onControlsGenerated]);

  // Track message state for simple change detection
  const lastMessageCountRef = useRef(0);
  const lastMessageTimestampRef = useRef(0);
  const hasControlsRef = useRef(false);
  
  // Track typing state to skip expensive operations during active typing
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update typing state when input changes
  useEffect(() => {
    // Mark as typing when input changes
    isTypingRef.current = true;
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Mark as not typing after 1.5 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
    }, 1500);
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [input]);
  
  // Simplified aggregation: only check for new messages OR when no controls are shown
  // Skip entirely while user is actively typing
  useEffect(() => {
    const callback = onControlsGeneratedRef.current;
    if (!currentSession?.messages || !callback) {
      // If no messages or no callback, clear controls if we had them before
      if (hasControlsRef.current) {
        hasControlsRef.current = false;
        callback?.(null);
      }
      lastMessageCountRef.current = 0;
      lastMessageTimestampRef.current = 0;
      return;
    }

    const messages = currentSession.messages;
    const messageCount = messages.length;
    const latestMessage = messages[messages.length - 1];
    const latestTimestamp = latestMessage?.timestamp || 0;
    
    // Check if there's a new message
    const hasNewMessage = 
      messageCount !== lastMessageCountRef.current ||
      latestTimestamp > lastMessageTimestampRef.current;
    
    // Check if we have no controls currently
    const hasNoControls = !hasControlsRef.current;
    
    // Only aggregate if: (new message) OR (no controls)
    const shouldAggregate = hasNewMessage || hasNoControls;
    
    if (!shouldAggregate) {
      return;
    }

    // Skip aggregation entirely if user is actively typing
    // This prevents lag during typing, especially with many messages
    if (isTypingRef.current) {
      return;
    }
    
    // Update refs before processing
    lastMessageCountRef.current = messageCount;
    lastMessageTimestampRef.current = latestTimestamp;

    // Use setTimeout to defer expensive computation and avoid blocking input
    const timeoutId = setTimeout(() => {
      // Double-check typing state before running expensive operation
      if (isTypingRef.current) {
        return;
      }
      
      const aggregatedControls = aggregateControlsFromMessages(messages);
    
      if (aggregatedControls) {
        hasControlsRef.current = true;
        callback(aggregatedControls);
      } else {
        hasControlsRef.current = false;
        callback(null);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [currentSession?.messages, currentSession?.id]);

  // Handle formalization
  const handleFormalize = useCallback(async () => {
    if (!currentSession || isFormalizing) return;

    setIsFormalizing(true);
    try {
      await formalizeProblem();
    } catch (error) {
      console.error('[ChatPanel] Formalization error:', error);
    } finally {
      setIsFormalizing(false);
    }
  }, [currentSession, isFormalizing, formalizeProblem]);

  // Handle reset formalization
  const handleResetFormalization = () => {
    if (window.confirm('Reset formalization to refine your problem definition?')) {
      resetFormalization();
      // Force a small delay to ensure state updates
      setTimeout(() => {
        // Session state will update automatically via subscription
      }, 100);
    }
  };

  // Generate controls from conversation
  const handleGenerateControls = useCallback(async (formalizationText?: string) => {
    // Prevent multiple simultaneous calls
    if (isGenerating) {
      return;
    }
    setIsGenerating(true);

    try {
      let controls;

      if (mode === 'experimental' && currentSession) {
        // Check if session has formalized data or aggregated incremental updates
        const aggregatedControls = aggregateControlsFromMessages(currentSession.messages || []);
        
        if (aggregatedControls) {
          controls = aggregatedControls;
        } else {
          alert('Please wait for the conversation to be analyzed first.');
          setIsGenerating(false);
          return;
        }
      } else {
        // AI mode: generate from conversation or specific formalization
        if (!currentSession?.id) {
          alert('Please connect to an AI provider first');
          setIsGenerating(false);
          return;
        }

        // If formalizationText is explicitly provided (button click), always generate new controls
        // Otherwise, check for existing aggregated controls first
        const shouldUseAggregated = !formalizationText;
        let aggregatedControls = null;
        
        if (shouldUseAggregated) {
          aggregatedControls = aggregateControlsFromMessages(currentSession.messages || []);
        if (aggregatedControls && aggregatedControls.variables && aggregatedControls.variables.length > 0) {
          // Use existing formalization directly
          console.log('[ChatPanel] Using existing formalization for controls');
          controls = aggregatedControls;
          }
        }

        // Generate new controls if we don't have aggregated ones or if explicitly requested
        if (!controls) {
          // Generate from conversation text
          const conversationText = formalizationText || getConversationText();

          const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              description: conversationText,
              model: model || 'gemini-2.5-flash',
              sessionId: currentSession.id,
            }),
          });

          if (!response.ok) {
            let errorMessage = `Generation failed: ${response.statusText}`;
            let errorDetails: string | undefined;
            try {
              const error = await response.json();
              errorMessage = error.error || error.details || errorMessage;
              errorDetails = typeof error.details === 'string' 
                ? error.details 
                : error.message 
                  ? String(error.message)
                  : JSON.stringify(error, null, 2);
            } catch {
              // If response is not JSON, use status text
            }
            const error = new Error(errorMessage) as Error & { details?: string };
            error.details = errorDetails;
            throw error;
          }

          controls = await response.json();
        }
      }

      // Save controls to session and pass to parent
      if (currentSession && controls) {
        await sessionManager.addMessage(
          currentSession.id,
          'ai',
          'Controls generated successfully! You can now use the Optimization Panel to configure and run your optimization.',
          {
            type: 'controls-generation',
            controlsGenerated: true,
            structuredData: controls, // Save controls for persistence
          }
        );
        
        // Reset message tracking to force re-aggregation on next check
        lastMessageCountRef.current = 0;
        lastMessageTimestampRef.current = 0;
      }

      // Pass to parent component immediately
      if (onControlsGenerated && controls) {
        onControlsGenerated(controls);
      }

    } catch (error) {
      console.error('[ChatPanel] Generation error:', error);

      // Extract error message and details
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      const errorDetails = (error as any)?.details || 
                          (error instanceof Error && error.stack ? error.stack : undefined) ||
                          (typeof error === 'string' ? error : JSON.stringify(error, null, 2));

      // Add error message after generation fails
      if (currentSession) {
        await sessionManager.addMessage(
          currentSession.id,
          'ai',
          'Failed to generate controls. Please try again or check your formalization.',
          {
            type: 'controls-generation',
            controlsError: errorMessage,
            errorDetails: errorDetails,
          }
        );
      }

      // No need for alert - error is displayed in the UI
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, mode, currentSession, getConversationText, model, sessionManager, onControlsGenerated]);

  return (
    <Paper
      elevation={4}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <ChatHeader session={currentSession} />

      {sessionTerminated && !sessionDeleted && (
        <Alert severity="info" sx={{ m: 2 }}>
          Your session was ended by a researcher. Starting a fresh conversation.
        </Alert>
      )}

      {sessionDeleted && (
        <Alert 
          severity="warning" 
          sx={{ m: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={async () => {
                try {
                  await createNewSession();
                } catch (error: any) {
                  // Handle backend rate limiting (429) when sessions were recently cleared
                  if (error?.response?.status === 429) {
                    const message = error?.response?.data?.detail || error?.message || 'Sessions were recently cleared. Please wait a moment and try again.';
                    alert(message);
                  } else {
                    alert('Failed to create new session. Please try again.');
                  }
                }
              }}
            >
              Create New Session
            </Button>
          }
        >
          Your session has been deleted or terminated. Click the button to start a new session.
        </Alert>
      )}

      <MessagesList
        messages={useMemo(() => {
          // Only transform if locallyCompletedMessages has items (avoid unnecessary work)
          if (locallyCompletedMessages.size === 0) {
            return displayMessages;
          }
          
          // Early return if no messages to process
          if (!displayMessages || displayMessages.length === 0) {
            return displayMessages;
          }
          
          // Create a Set for faster lookup (O(1) instead of O(n))
          const completedIdsSet = locallyCompletedMessages;
          
          // Only process messages that might need transformation
          // This avoids creating new arrays when nothing needs to change
          let needsTransformation = false;
          for (const msg of displayMessages) {
            if (completedIdsSet.has(msg.id) && msg.metadata?.type === 'controls-generation') {
              needsTransformation = true;
              break;
            }
          }
          
          if (!needsTransformation) {
            return displayMessages;
          }
          
          return displayMessages.map(msg => {
          // Apply local state overrides for messages that completed locally
          if (completedIdsSet.has(msg.id) && msg.metadata?.type === 'controls-generation') {
            return {
              ...msg,
              content: 'Controls generated successfully! You can now use the Optimization Panel to configure and run your optimization.',
              metadata: {
                ...(msg.metadata || {}),
                controlsGenerated: true
              }
            };
          }
          return msg;
          });
        }, [displayMessages, locallyCompletedMessages])}
        mode={mode}
        apiKey={apiKey}
        isLoading={isLoading}
        messagesEndRef={messagesEndRef}
        messagesContainerRef={messagesContainerRef}
        isWaitingForResearcher={isWaitingForResearcher}
        isGenerating={isGenerating}
        onGenerateControls={handleGenerateControls}
      />

      {/* Show formalize button only when not formalized */}
      {currentSession?.status !== 'formalized' && (
        <FormalizeButton
          mode={mode}
          apiKey={apiKey}
          currentSession={currentSession}
          isLoading={isLoading}
          isFormalizing={isFormalizing}
          onFormalize={handleFormalize}
        />
      )}

      <ChatInput
        input={input} // Clear counter - increments when input should be reset
        onInputChange={setInput} // Updates ref in useChatSession
        onSubmit={handleSubmit}
        isLoading={isLoading}
        disabled={sessionDeleted}
      />

      {/* Temporarily hide the API warning banner per request */}
      {/* {!apiKey && (
        <Box
          sx={{
            p: 1,
            bgcolor: 'warning.main',
            color: 'warning.contrastText',
            textAlign: 'center',
            animation: 'blink 1s infinite',
            '@keyframes blink': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.5 },
              '100%': { opacity: 1 },
            },
          }}
        >
          <Typography variant="body2" fontWeight="bold">
            ⚠️ No AI API key configured. Click the AI connection status chip to set it up.
          </Typography>
        </Box>
      )} */}
    </Paper>
  );
}
