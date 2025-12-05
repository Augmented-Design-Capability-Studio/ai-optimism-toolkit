'use client';

import { Paper, Alert, Box, Typography, Button } from '@mui/material';
import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  useChatSession,
  ChatHeader,
  MessagesList,
  FormalizeButton,
  ChatInput,
} from './chat';
import { useSessionManager } from '../services/sessionManager';
import type { Message } from '../services/sessionManager';
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
  const lastAggregatedControlsRef = useRef<string | null>(null);

  useEffect(() => {
    onControlsGeneratedRef.current = onControlsGenerated;
  }, [onControlsGenerated]);

  // Track messages to avoid unnecessary aggregations
  const messagesRef = useRef<Message[]>([]);
  const messagesHashRef = useRef<string>('');
  
  // Debounce expensive aggregation to avoid blocking input
  // Only run when messages actually change (not on every render)
  useEffect(() => {
    if (!currentSession?.messages || !onControlsGeneratedRef.current) {
      // If no messages or no callback, clear controls if we had them before
      if (lastAggregatedControlsRef.current !== null && onControlsGeneratedRef.current) {
        lastAggregatedControlsRef.current = null;
        onControlsGeneratedRef.current(null);
      }
      messagesRef.current = [];
      messagesHashRef.current = '';
      return;
    }

    const messages = currentSession.messages;
    
    // Quick check: only process if messages actually changed
    // Create a simple hash from message IDs and timestamps (much faster than full JSON.stringify)
    // Only check last 10 messages for hash (most recent changes) to avoid expensive computation
    const recentMessages = messages.slice(-10);
    const messagesHash = recentMessages
      .map(m => `${m.id}:${m.timestamp}`)
      .join('|');
    
    // Skip if nothing changed (compare both length and hash of recent messages)
    if (
      messagesRef.current.length === messages.length &&
      messagesHashRef.current === messagesHash
    ) {
      return;
    }
    
    messagesRef.current = messages;
    messagesHashRef.current = messagesHash;

    // Use setTimeout to defer expensive computation and avoid blocking input
    const timeoutId = setTimeout(() => {
      const aggregatedControls = aggregateControlsFromMessages(messages);
    
    // Only call callback if controls actually changed
    if (aggregatedControls) {
        // Create a lightweight hash using only essential fields (avoid expensive JSON.stringify of full objects)
        const controlsHash = [
          aggregatedControls.variables?.length || 0,
          aggregatedControls.objectives?.length || 0,
          aggregatedControls.constraints?.length || 0,
          aggregatedControls.properties?.length || 0,
          // Add a hash of just the names/expressions (much faster than full objects)
          aggregatedControls.variables?.map(v => v.name).join(',') || '',
          aggregatedControls.objectives?.map(o => `${o.name}:${o.expression.substring(0, 50)}`).join(',') || '',
        ].join('|');

        if (lastAggregatedControlsRef.current !== controlsHash && onControlsGeneratedRef.current) {
        lastAggregatedControlsRef.current = controlsHash;
        onControlsGeneratedRef.current(aggregatedControls);
      }
    } else if (lastAggregatedControlsRef.current !== null && onControlsGeneratedRef.current) {
      // Controls were cleared, reset the ref and explicitly clear parent controls
      lastAggregatedControlsRef.current = null;
      onControlsGeneratedRef.current(null); // Explicitly clear controls in parent
    }
    }, 500); // Increased debounce to 500ms to reduce frequency during typing

    return () => clearTimeout(timeoutId);
  }, [currentSession?.messages, currentSession?.id]);

  // Handle formalization
  const handleFormalize = async () => {
    if (!currentSession || isFormalizing) return;

    setIsFormalizing(true);
    try {
      await formalizeProblem();
    } catch (error) {
      console.error('[ChatPanel] Formalization error:', error);
    } finally {
      setIsFormalizing(false);
    }
  };

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
  const handleGenerateControls = async (formalizationText?: string) => {
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
            try {
              const error = await response.json();
              errorMessage = error.error || error.details || errorMessage;
            } catch {
              // If response is not JSON, use status text
            }
            throw new Error(errorMessage);
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
        
        // Force update by clearing the hash so the useEffect will detect the change
        // This ensures controls update even if the hash comparison might miss it
        lastAggregatedControlsRef.current = null;
      }

      // Pass to parent component immediately
      if (onControlsGenerated && controls) {
        onControlsGenerated(controls);
      }

    } catch (error) {
      console.error('[ChatPanel] Generation error:', error);

      // Add error message after generation fails
      if (currentSession) {
        await sessionManager.addMessage(
          currentSession.id,
          'ai',
          'Failed to generate controls. Please try again or check your formalization.',
          {
            type: 'controls-generation',
            controlsError: 'Generation failed',
          }
        );
      }

      alert('Failed to generate controls. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

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
          
          return displayMessages.map(msg => {
          // Apply local state overrides for messages that completed locally
          if (locallyCompletedMessages.has(msg.id) && msg.metadata?.type === 'controls-generation') {
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
        input={input}
        onInputChange={setInput}
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
