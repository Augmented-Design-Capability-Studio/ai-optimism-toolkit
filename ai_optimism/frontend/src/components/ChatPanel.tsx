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
        const formalizedMessage = currentSession.messages.find(
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
                      type: 'controls-generation',
                      controlsGenerated: true 
                    } 
                  }
                : m
            );
            console.log('[ChatPanel] Updating message with controlsGenerated:', thinkingMessageId);
            await sessionManager.updateSession(currentSession.id, { messages: updatedMessages });
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
        const currentMessages = sessionData?.messages || currentSession.messages;
        const updatedMessages = currentMessages.map((m: Message) => 
          m.id === thinkingMessageId
            ? { 
                ...m, 
                content: 'Failed to generate controls. Please try again or check your formalization.',
                metadata: { 
                  ...(m.metadata || {}), 
                  type: 'controls-generation',
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
        messages={displayMessages}
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
