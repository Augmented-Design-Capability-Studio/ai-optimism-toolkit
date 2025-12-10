'use client';

import { Paper, Alert, Box, Button } from '@mui/material';
import { useRef, useState, useEffect, useCallback } from 'react';
import {
  ChatHeader,
  MessagesList,
  ChatInput,
} from '@/core/components/chat';
import { FormalizeButton } from '../components/FormalizeButton';
import { useChatSession } from '../hooks/useChatSession';
import { useSessionManager } from '@/core/services/sessionManager';
import type { Message, Session } from '@/core/services/sessionManager';
import { aggregateControlsFromMessages } from '../services/controlsAggregator';
import { useComponentGeneration } from '@/core/components/chat/hooks/useComponentGeneration';

interface ChatPanelProps {
  onControlsGenerated?: (controls: unknown) => void;
  onSessionUpdate?: (session: Session | null) => void;
}

export function ChatPanel({ onControlsGenerated, onSessionUpdate }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFormalizing, setIsFormalizing] = useState(false);
  const sessionManager = useSessionManager();
  
  const {
    input,
    setInput,
    currentSession,
    mode,
    displayMessages,
    isLoading,
    status,
    isWaitingForResearcher,
    sessionTerminated,
    sessionDeleted,
    isCreatingSession,
    apiKey,
    provider,
    model,
    handleSubmit,
    getConversationText,
    formalizeProblem,
    resetFormalization,
    createNewSession,
    sendMessage,
  } = useChatSession();

  // Component generation hook
  const { generateComponent } = useComponentGeneration({
    currentSession,
    sessionManager,
    sendMessage,
  });

  // Notify parent when session updates (to sync AppBar's currentSession)
  // Use ref to avoid dependency on callback to prevent infinite loops
  const onSessionUpdateRef = useRef(onSessionUpdate);
  const lastNotifiedSessionRef = useRef<string | null>(null);
  const lastNotifiedUpdatedAtRef = useRef<number | null>(null);
  const lastNotifiedMsgLenRef = useRef<number | null>(null);
  const lastNotifiedAIHashRef = useRef<string | null>(null);
  useEffect(() => {
    onSessionUpdateRef.current = onSessionUpdate;
  }, [onSessionUpdate]);
  
  useEffect(() => {
    const sess = currentSession;
    if (!sess) {
      if (lastNotifiedSessionRef.current !== null) {
        lastNotifiedSessionRef.current = null;
        lastNotifiedUpdatedAtRef.current = null;
        lastNotifiedMsgLenRef.current = null;
        onSessionUpdateRef.current?.(null);
      }
      return;
    }

    const msgLen = Array.isArray(sess.messages) ? sess.messages.length : 0;
    const updatedAt = typeof sess.updatedAt === 'number' ? sess.updatedAt : null;
    const aiHash = sess.aiConfig
      ? [
          sess.aiConfig.status,
          sess.aiConfig.provider,
          sess.aiConfig.model,
          sess.aiConfig.endpoint,
          sess.aiConfig.setBy,
          sess.aiConfig.setAt,
        ].join('|')
      : null;

    const same =
      lastNotifiedSessionRef.current === sess.id &&
      lastNotifiedUpdatedAtRef.current === updatedAt &&
      lastNotifiedMsgLenRef.current === msgLen &&
      lastNotifiedAIHashRef.current === aiHash;

    if (same) return;

    lastNotifiedSessionRef.current = sess.id;
    lastNotifiedUpdatedAtRef.current = updatedAt;
    lastNotifiedMsgLenRef.current = msgLen;
    lastNotifiedAIHashRef.current = aiHash;
    onSessionUpdateRef.current?.(sess);
  }, [currentSession]);

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
    
    // CRITICAL: Skip aggregation if latest message is an optimization-run
    // Optimization runs add bounds to controls via handleOptimizationResults,
    // and we don't want to overwrite those bounds with reaggregation
    if (latestMessage?.metadata?.type === 'optimization-run') {
      // Update refs to prevent re-triggering on next render
      lastMessageCountRef.current = messageCount;
      lastMessageTimestampRef.current = latestTimestamp;
      return;
    }
    
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

  // Track processed trigger-formalize messages to avoid duplicate triggers
  const processedTriggerMessagesRef = useRef<Set<string>>(new Set());
  const lastSessionIdRef = useRef<string | null>(null);

  // Reset processed triggers when session changes
  useEffect(() => {
    if (currentSession?.id !== lastSessionIdRef.current) {
      processedTriggerMessagesRef.current.clear();
      lastSessionIdRef.current = currentSession?.id || null;
    }
  }, [currentSession?.id]);

  // Track component generation state
  const [isGeneratingComponent, setIsGeneratingComponent] = useState<string | null>(null);

  // Detect trigger-formalize and trigger-generate-component messages
  useEffect(() => {
    if (!currentSession?.messages || !currentSession) return;

    // Check for new trigger-formalize messages
    const formalizeTriggers = currentSession.messages.filter(
      (msg: Message) => 
        msg.metadata?.type === 'trigger-formalize' && 
        !processedTriggerMessagesRef.current.has(msg.id)
    );

    if (formalizeTriggers.length > 0 && !isFormalizing) {
      // Process the most recent trigger message
      const latestTrigger = formalizeTriggers[formalizeTriggers.length - 1];
      processedTriggerMessagesRef.current.add(latestTrigger.id);

      // Auto-trigger formalization (simulating user click)
      const autoFormalize = async () => {
        if (!currentSession || isFormalizing) return;
        
        setIsFormalizing(true);
        try {
          await formalizeProblem();
        } catch (error) {
          console.error('[ChatPanel] Auto-formalization error:', error);
        } finally {
          setIsFormalizing(false);
        }
      };

      // Small delay to ensure the message is fully processed
      setTimeout(autoFormalize, 100);
      return;
    }

    // Check for component generation triggers
    const componentTriggers = currentSession.messages.filter(
      (msg: Message) => 
        msg.metadata?.type === 'trigger-generate-component' && 
        !processedTriggerMessagesRef.current.has(msg.id)
    );

    if (componentTriggers.length > 0 && !isGeneratingComponent) {
      const latestTrigger = componentTriggers[componentTriggers.length - 1];
      const component = latestTrigger.metadata?.component as 'variables' | 'properties' | 'objectives' | 'constraints';
      
      if (component) {
        processedTriggerMessagesRef.current.add(latestTrigger.id);
        
        const autoGenerate = async () => {
          if (!currentSession || isGeneratingComponent) return;
          
          setIsGeneratingComponent(component);
          try {
            await generateComponent(component);
          } catch (error) {
            console.error('[ChatPanel] Auto-component-generation error:', error);
          } finally {
            setIsGeneratingComponent(null);
          }
        };
        
        setTimeout(autoGenerate, 100);
      }
      return;
    }
  }, [currentSession?.messages, currentSession?.id, currentSession, isFormalizing, isGeneratingComponent, formalizeProblem, generateComponent]);

  // Handle formalization (manual trigger from button)
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

  // Generate controls from conversation - uses pure aggregator (no AI calls)
  // Accepts either a JSON object (from formalization bubble) or a string (from normal message bubble or text)
  const handleGenerateControls = useCallback(async (formalizationText?: string | any) => {
    // Prevent multiple simultaneous calls
    if (isGenerating) {
      return;
    }
    setIsGenerating(true);

    try {
      if (!currentSession?.id) {
        alert('No active session');
        setIsGenerating(false);
        return;
      }

      let controls;

      // Check if formalizationText is actually a JSON object (from Generate Controls button)
      // The formalization bubble now passes structuredData directly as an object
      if (formalizationText && typeof formalizationText === 'object') {
        // It's already a parsed JSON object (from formalization bubble)
        console.log('[ChatPanel] Using provided JSON object directly as controls');
        controls = formalizationText;
      } else if (formalizationText && typeof formalizationText === 'string') {
        // It's a string - try to parse as JSON first
        try {
          const parsed = JSON.parse(formalizationText.trim());
          // Check if it's a valid controls object (has variables, objectives, etc.)
          if (parsed.variables || parsed.objectives || parsed.constraints || parsed.properties) {
            console.log('[ChatPanel] Using parsed JSON string directly as controls');
            controls = parsed;
          }
        } catch (e) {
          // Not JSON, will use aggregator below
        }
      }

      // Use aggregator to get controls from messages (no API calls)
      if (!controls) {
        const aggregatedControls = aggregateControlsFromMessages(currentSession.messages || []);
        if (aggregatedControls && aggregatedControls.variables && aggregatedControls.variables.length > 0) {
          console.log('[ChatPanel] Using aggregated controls from messages');
          controls = aggregatedControls;
        }
      }

      if (!controls || !controls.variables || controls.variables.length === 0) {
        alert('No structured data found in conversation. Please formalize the problem first.');
        setIsGenerating(false);
        return;
      }

      // Save controls to session and pass to parent
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
  }, [isGenerating, currentSession, sessionManager, onControlsGenerated]);

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

      {(sessionDeleted || (!currentSession && !isCreatingSession)) && (
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
        messages={displayMessages}
        mode={mode}
        apiKey={apiKey}
        isLoading={isLoading}
        status={status}
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

    </Paper>
  );
}
