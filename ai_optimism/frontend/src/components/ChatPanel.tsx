'use client';

import { Paper, Alert, Box, Typography, Button } from '@mui/material';
import { useRef, useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!currentSession?.messages || !onControlsGeneratedRef.current) {
      // If no messages or no callback, clear controls if we had them before
      if (lastAggregatedControlsRef.current !== null && onControlsGeneratedRef.current) {
        lastAggregatedControlsRef.current = null;
        onControlsGeneratedRef.current(null);
      }
      return;
    }

    const aggregatedControls = aggregateControlsFromMessages(currentSession.messages);
    
    // Only call callback if controls actually changed
    if (aggregatedControls) {
      // Create a comprehensive hash that includes content, not just counts
      // This ensures we detect changes in expressions, descriptions, etc.
      const controlsHash = JSON.stringify({
        variables: aggregatedControls.variables?.map(v => ({
          name: v.name,
          type: v.type,
          min: v.min,
          max: v.max,
          default: v.default,
          categories: v.categories,
        })).sort((a, b) => a.name.localeCompare(b.name)) || [],
        objectives: aggregatedControls.objectives?.map(o => ({
          name: o.name,
          expression: o.expression,
          goal: o.goal,
        })).sort((a, b) => a.name.localeCompare(b.name)) || [],
        constraints: aggregatedControls.constraints?.map(c => ({
          expression: c.expression,
          title: c.title,
        })).sort((a, b) => (a.expression || '').localeCompare(b.expression || '')) || [],
        properties: aggregatedControls.properties?.map(p => ({
          name: p.name,
          expression: p.expression,
        })).sort((a, b) => a.name.localeCompare(b.name)) || [],
      });

      if (lastAggregatedControlsRef.current !== controlsHash) {
        lastAggregatedControlsRef.current = controlsHash;
        onControlsGeneratedRef.current(aggregatedControls);
      }
    } else if (lastAggregatedControlsRef.current !== null && onControlsGeneratedRef.current) {
      // Controls were cleared, reset the ref and explicitly clear parent controls
      lastAggregatedControlsRef.current = null;
      onControlsGeneratedRef.current(null); // Explicitly clear controls in parent
    }
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

        // First, check if we have a formalization with structured data
        const aggregatedControls = aggregateControlsFromMessages(currentSession.messages || []);
        if (aggregatedControls && aggregatedControls.variables && aggregatedControls.variables.length > 0) {
          // Use existing formalization directly
          console.log('[ChatPanel] Using existing formalization for controls');
          controls = aggregatedControls;
        } else {
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
        messages={displayMessages.map(msg => {
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
        })}
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
