'use client';

import { Paper, Alert } from '@mui/material';
import { useRef, useState, useEffect } from 'react';
import { 
  useChatSession,
  ChatHeader,
  MessagesList,
  GenerateControlsButton,
  ChatInput,
  ConnectionWarning,
} from './chat';
import type { Message } from '../services/sessionManager';

interface ChatPanelProps {
  onControlsGenerated?: (controls: unknown) => void;
}

export function ChatPanel({ onControlsGenerated }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFormalizing, setIsFormalizing] = useState(false);

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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages]);

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
    const sessionManager = require('../services/sessionManager').sessionManager;
    const thinkingMessageId = `msg-${Date.now()}`;
    
    if (currentSession) {
      const thinkingMessage = {
        id: thinkingMessageId,
        sessionId: currentSession.id,
        sender: 'assistant' as const,
        content: 'Generating optimization controls...',
        timestamp: Date.now(),
        metadata: {
          type: 'controls-generation' as const,
        },
      };
      
      const updatedSession = sessionManager.updateSession(currentSession.id, { 
        messages: [...currentSession.messages, thinkingMessage]
      });
      
      // Force immediate refresh by getting the session again
      if (updatedSession) {
        const refreshedSession = sessionManager.getSession(currentSession.id);
        console.log('[ChatPanel] Added thinking message, refreshed session:', refreshedSession?.messages.length);
      }
    }
    
    try {
      let controls;
      
      if (mode === 'experimental' && currentSession) {
        // Check if session has formalized data
        const formalizedMessage = currentSession.messages.find(
          m => m.metadata?.type === 'formalization'
        );
        
        if (formalizedMessage?.metadata?.structuredData) {
          // Use pre-formalized controls
          controls = formalizedMessage.metadata.structuredData;
          console.log('[ChatPanel] Using formalized controls:', controls);
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

        // Use provided formalization text or get from conversation
        const conversationText = formalizationText || getConversationText();
        console.log('[ChatPanel] Generating controls from formalization:', conversationText.substring(0, 100));
        
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
        console.log('[ChatPanel] Generated controls:', controls);
      }
      
      // Update the thinking message to show success
      if (currentSession) {
        const currentMessages = sessionManager.getSession(currentSession.id)?.messages || currentSession.messages;
        const updatedMessages = currentMessages.map((m: Message) => 
          m.id === thinkingMessageId
            ? { 
                ...m, 
                content: 'Controls generated successfully! You can now use the Optimization Panel to configure and run your optimization.',
                metadata: { ...m.metadata, controlsGenerated: true } 
              }
            : m
        );
        const updatedSession = sessionManager.updateSession(currentSession.id, { 
          messages: updatedMessages 
        });
        console.log('[ChatPanel] Updated thinking message to success, session:', updatedSession?.messages.find((m: Message) => m.id === thinkingMessageId));
      }
      
      // Pass to parent component
      if (onControlsGenerated && controls) {
        onControlsGenerated(controls);
      }

    } catch (error) {
      console.error('[ChatPanel] Generation error:', error);
      
      // Update the thinking message to show error
      if (currentSession) {
        const currentMessages = sessionManager.getSession(currentSession.id)?.messages || currentSession.messages;
        const updatedMessages = currentMessages.map((m: Message) => 
          m.id === thinkingMessageId
            ? { 
                ...m, 
                content: 'Failed to generate controls. Please try again or check your formalization.',
                metadata: { ...m.metadata, controlsError: 'Generation failed' } 
              }
            : m
        );
        const updatedSession = sessionManager.updateSession(currentSession.id, { 
          messages: updatedMessages 
        });
        console.log('[ChatPanel] Updated thinking message to error, session:', updatedSession?.messages.find((m: Message) => m.id === thinkingMessageId));
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
      <ChatHeader mode={mode} />
      
      {sessionTerminated && (
        <Alert severity="info" sx={{ m: 2 }}>
          Your previous session has ended. Starting a fresh conversation.
        </Alert>
      )}
      
      <MessagesList
        messages={displayMessages}
        mode={mode}
        apiKey={apiKey}
        isLoading={isLoading}
        messagesEndRef={messagesEndRef}
        isResearcherTyping={currentSession?.isResearcherTyping}
        isWaitingForResearcher={isWaitingForResearcher}
        onGenerateControls={handleGenerateControls}
      />

      {/* Show formalize button only when not formalized */}
      {currentSession?.status !== 'formalized' && (
        <GenerateControlsButton
          displayMessagesLength={displayMessages.length}
          mode={mode}
          apiKey={apiKey}
          currentSession={currentSession}
          isGenerating={isGenerating}
          isLoading={isLoading}
          isFormalizing={isFormalizing}
          onGenerate={handleGenerateControls}
          onFormalize={handleFormalize}
          onResetFormalization={handleResetFormalization}
        />
      )}

      <ChatInput
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        mode={mode}
        apiKey={apiKey}
      />

      <ConnectionWarning apiKey={apiKey} mode={mode} />
    </Paper>
  );
}
