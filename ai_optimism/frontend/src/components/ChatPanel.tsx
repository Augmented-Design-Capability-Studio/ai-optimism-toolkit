'use client';

import { Paper, Alert, Box, Typography } from '@mui/material';
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
    apiKey,
    provider,
    model,
    handleSubmit,
    getConversationText,
    formalizeProblem,
    resetFormalization,
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
    setIsGenerating(true);

    // Add a thinking message for the generation process
    let thinkingMessageId: string | null = null;

    if (currentSession) {
      // Use addMessage to properly add the message to the session
      const addedMessage = await sessionManager.addMessage(
        currentSession.id,
        'ai',
        'Generating optimization controls...',
        {
          type: 'controls-generation',
        }
      );

      if (addedMessage) {
        thinkingMessageId = addedMessage.id;
      }
    }

    try {
      let controls;

      if (mode === 'experimental' && currentSession) {
        // Check if session has formalized data
        const formalizedMessage = currentSession.messages?.find(
          m => m.metadata?.type === 'formalization'
        );

        if (formalizedMessage?.metadata?.structuredData) {
          controls = formalizedMessage.metadata.structuredData;
        } else {
          alert('Please wait for the conversation to be analyzed first.');
          setIsGenerating(false);
          return;
        }
      } else {
        // AI mode: generate from conversation or specific formalization
        if (!apiKey) {
          alert('Please connect to an AI provider first');
          setIsGenerating(false);
          return;
        }

        const conversationText = formalizationText || getConversationText();

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            description: conversationText,
            model: model || 'gemini-2.0-flash',
          }),
        });

        if (!response.ok) {
          throw new Error(`Generation failed: ${response.statusText}`);
        }

        controls = await response.json();
      }

      // Update the thinking message to show success
      if (currentSession && thinkingMessageId) {
        // Wait a bit for the message to be added to the backend and session to refresh
        await new Promise(resolve => setTimeout(resolve, 200));

        // Retry getting fresh session data a few times to ensure message is there
        let sessionData = await sessionManager.getSession(currentSession.id);
        let retries = 0;
        while (retries < 5 && sessionData) {
          const messageExists = sessionData.messages.some((m: Message) => m.id === thinkingMessageId);
          if (messageExists) break;
          await new Promise(resolve => setTimeout(resolve, 100));
          sessionData = await sessionManager.getSession(currentSession.id);
          retries++;
        }

        if (sessionData) {
          const currentMessages = sessionData.messages;
          const messageToUpdate = currentMessages.find((m: Message) => m.id === thinkingMessageId);

          if (messageToUpdate) {
            const updatedMessages = currentMessages.map((m: Message) =>
              m.id === thinkingMessageId
                ? {
                  ...m,
                  content: 'Controls generated successfully! You can now use the Optimization Panel to configure and run your optimization.',
                  metadata: {
                    ...(m.metadata || {}),
                    type: 'controls-generation' as const,
                    controlsGenerated: true
                  }
                }
                : m
            );
            console.log('[ChatPanel] Updating message with controlsGenerated:', thinkingMessageId);
            console.log('[ChatPanel] Updated message metadata:', updatedMessages.find(m => m.id === thinkingMessageId)?.metadata);
            
            // Try to update the backend - this MUST succeed for the purple bubble to persist
            // Retry with exponential backoff to handle transient network issues
            let backendUpdateSucceeded = false;
            const maxRetries = 3;
            let retryDelay = 500; // Start with 500ms
            
            for (let attempt = 0; attempt < maxRetries; attempt++) {
              try {
                console.log(`[ChatPanel] Attempting to update message in backend (attempt ${attempt + 1}/${maxRetries})...`);
                
                // Log what we're sending
                const messageToUpdate = updatedMessages.find(m => m.id === thinkingMessageId);
                console.log('[ChatPanel] Message to update:', {
                  id: messageToUpdate?.id,
                  metadata: messageToUpdate?.metadata,
                  content: messageToUpdate?.content?.substring(0, 50) + '...',
                });
                
                // Ensure all message objects have all required fields for the backend
                // Send all messages (backend needs the full array to match IDs)
                const messagesForBackend = updatedMessages.map((m: Message) => ({
                  id: m.id,
                  sessionId: m.sessionId || currentSession.id,
                  sender: m.sender,
                  content: m.content,
                  timestamp: m.timestamp,
                  metadata: m.metadata, // Use 'metadata' (not 'metadata_') for API
                }));
                
                console.log(`[ChatPanel] Sending ${messagesForBackend.length} messages to backend`);
                console.log('[ChatPanel] Message with controlsGenerated:', 
                  messagesForBackend.find(m => m.id === thinkingMessageId)?.metadata
                );
                
                const updatedSession = await sessionManager.updateSession(currentSession.id, { messages: messagesForBackend });
                
                if (updatedSession) {
                  // Verify the update actually worked by checking the returned session
                  const updatedMsg = updatedSession.messages?.find((m: Message) => m.id === thinkingMessageId);
                  if (updatedMsg?.metadata?.controlsGenerated) {
                    backendUpdateSucceeded = true;
                    console.log('[ChatPanel] Message successfully updated in backend with controlsGenerated flag');
                    break;
                  } else {
                    console.warn('[ChatPanel] Backend returned session but message metadata not updated as expected');
                    console.warn('[ChatPanel] Expected metadata:', messageToUpdate?.metadata);
                    console.warn('[ChatPanel] Actual metadata from backend:', updatedMsg?.metadata);
                    if (attempt < maxRetries - 1) {
                      // Wait before retrying
                      await new Promise(resolve => setTimeout(resolve, retryDelay));
                      retryDelay *= 2; // Exponential backoff
                    }
                  }
                } else {
                  // Backend update returned null - this means an error occurred
                  if (attempt < maxRetries - 1) {
                    console.warn(
                      `[ChatPanel] Backend update returned null (attempt ${attempt + 1}/${maxRetries}). ` +
                      `Check SessionManager logs above for error details. Retrying...`
                    );
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    retryDelay *= 2;
                  } else {
                    console.error(
                      '[ChatPanel] Backend update failed after all retries - message will not persist correctly. ' +
                      'Check SessionManager error logs above for details (404, network error, 500, etc.). ' +
                      'The backend may be unreachable, the session may not exist, or there may be a backend error.'
                    );
                  }
                }
              } catch (error: any) {
                // Network error or other failure
                const errorMessage = error.message || 'Unknown error';
                const isNetworkError = errorMessage.includes('Network Error') || 
                                     error.code === 'ECONNREFUSED' || 
                                     error.code === 'ERR_NETWORK' ||
                                     !error.response;
                
                if (attempt < maxRetries - 1) {
                  console.warn(
                    `[ChatPanel] Error updating backend (attempt ${attempt + 1}/${maxRetries}): ${errorMessage}. Retrying...`
                  );
                  await new Promise(resolve => setTimeout(resolve, retryDelay));
                  retryDelay *= 2;
                  } else {
                    // Final attempt failed - log detailed error
                    console.error(`[ChatPanel] Backend update failed after ${maxRetries} attempts.`);
                    console.error('[ChatPanel] Error details:', {
                      message: error.message,
                      code: error.code,
                      status: error.response?.status,
                      statusText: error.response?.statusText,
                      data: error.response?.data,
                      isNetworkError,
                    });
                    
                    if (isNetworkError) {
                      console.error(
                        `[ChatPanel] Backend unreachable - purple bubble will not persist. ` +
                        `Check backend server logs for more details.`
                      );
                    } else {
                      console.error(
                        `[ChatPanel] Backend returned error ${error.response?.status || 'unknown'}. ` +
                        `Check browser console and backend logs for details.`
                      );
                    }
                  }
              }
            }
            
            // If backend update failed, use local state override to show success in UI
            if (!backendUpdateSucceeded && thinkingMessageId && currentSession) {
              console.log('[ChatPanel] Using local state override to show message completion');
              setLocallyCompletedMessages(prev => {
                const updated = new Set(prev).add(thinkingMessageId);
                // Persist to localStorage so it survives page refreshes
                try {
                  const storageKey = getLocalStorageKey(currentSession.id);
                  localStorage.setItem(storageKey, JSON.stringify(Array.from(updated)));
                } catch (error) {
                  console.error('[ChatPanel] Failed to persist locally completed messages:', error);
                }
                return updated;
              });
            }
            
            // After backend update succeeds, verify it persisted
            if (backendUpdateSucceeded) {
              // Wait a moment for the update to be committed
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Verify the update persisted by checking the backend again
              try {
                const verifiedSession = await sessionManager.getSession(currentSession.id);
                if (verifiedSession) {
                  const verifiedMsg = verifiedSession.messages?.find(m => m.id === thinkingMessageId);
                  if (verifiedMsg?.metadata?.controlsGenerated) {
                    console.log('[ChatPanel] Verified: Message metadata persisted in backend successfully');
                    // Clear local override since backend has the correct state
                    setLocallyCompletedMessages(prev => {
                      const next = new Set(prev);
                      next.delete(thinkingMessageId);
                      // Clean up localStorage since backend has the correct state
                      if (currentSession) {
                        try {
                          const storageKey = getLocalStorageKey(currentSession.id);
                          const remaining = Array.from(next).filter(id => id !== thinkingMessageId);
                          if (remaining.length > 0) {
                            localStorage.setItem(storageKey, JSON.stringify(remaining));
                          } else {
                            localStorage.removeItem(storageKey);
                          }
                        } catch (error) {
                          console.error('[ChatPanel] Failed to clean up localStorage:', error);
                        }
                      }
                      return next;
                    });
                  } else {
                    console.warn('[ChatPanel] Warning: Backend update appeared to succeed but metadata not found on verification');
                    // Keep local override as fallback
                  }
                }
              } catch (verifyError) {
                console.warn('[ChatPanel] Failed to verify backend update:', verifyError);
                // Keep local override as fallback
              }
            } else {
              console.warn('[ChatPanel] Backend update failed - purple bubble will use localStorage fallback');
            }
          } else {
            console.warn('[ChatPanel] Message not found for update:', thinkingMessageId);
          }
        }
      }

      // Pass to parent component
      if (onControlsGenerated && controls) {
        onControlsGenerated(controls);
      }

    } catch (error) {
      console.error('[ChatPanel] Generation error:', error);

      // Update the thinking message to show error
      if (currentSession && thinkingMessageId) {
        // Wait a bit for the message to be added to the backend
        await new Promise(resolve => setTimeout(resolve, 100));

        const sessionData = await sessionManager.getSession(currentSession.id);
        const currentMessages = sessionData?.messages || currentSession.messages || [];
        const updatedMessages = currentMessages.map((m: Message) =>
          m.id === thinkingMessageId
            ? {
              ...m,
              content: 'Failed to generate controls. Please try again or check your formalization.',
              metadata: {
                ...(m.metadata || {}),
                type: 'controls-generation' as const,
                controlsError: 'Generation failed'
              }
            }
            : m
        );
        await sessionManager.updateSession(currentSession.id, { messages: updatedMessages });
      }

      alert('Failed to generate controls. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <ChatHeader session={currentSession} />

      {sessionTerminated && (
        <Alert severity="info" sx={{ m: 2 }}>
          Your session was ended by a researcher. Starting a fresh conversation.
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
        isResearcherTyping={currentSession?.isResearcherTyping}
        isWaitingForResearcher={isWaitingForResearcher}
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
      />

      {!apiKey && (
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
      )}
    </Paper>
  );
}
