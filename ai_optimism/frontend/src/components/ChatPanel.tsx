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
import { sessionManager } from '../services/sessionManager';

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
    if (!currentSession) {
      console.error('[ChatPanel] No current session available');
      return;
    }

    setIsGenerating(true);
    try {
      let controls;
      
      if (mode === 'experimental') {
        // Check if session has formalized data
        const formalizedMessage = currentSession.messages.find(
          m => m.metadata?.type === 'formalization'
        );
        
        if (formalizedMessage?.metadata?.structuredData) {
          // Use pre-formalized controls
          controls = formalizedMessage.metadata.structuredData;
          console.log('[ChatPanel] Using formalized controls:', controls);
        } else {
          // Add failed generation message
          sessionManager.addMessage(currentSession.id, 'ai', 'Failed to generate controls: No formalized problem data available. Please formalize the problem first.', {
            type: 'generation',
            generationStatus: 'failed',
          });
          setIsGenerating(false);
          return;
        }
      } else {
        // AI mode: generate from conversation or specific formalization
        if (!apiKey) {
          sessionManager.addMessage(currentSession.id, 'ai', 'Failed to generate controls: Please connect to an AI provider first.', {
            type: 'generation',
            generationStatus: 'failed',
          });
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
      
      // Pass to parent component
      if (onControlsGenerated && controls) {
        onControlsGenerated(controls);
        
        // Add success message with controls summary
        const controlCount = controls.optimizationVariables?.length || 0;
        const constraintCount = controls.constraints?.length || 0;
        sessionManager.addMessage(
          currentSession.id, 
          'ai', 
          `✨ Successfully generated optimization controls:\n- ${controlCount} optimization variable${controlCount !== 1 ? 's' : ''}\n- ${constraintCount} constraint${constraintCount !== 1 ? 's' : ''}`, 
          {
            type: 'generation',
            generationStatus: 'success',
            structuredData: controls,
          }
        );
      }

    } catch (error) {
      console.error('[ChatPanel] Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      sessionManager.addMessage(
        currentSession.id, 
        'ai', 
        `❌ Failed to generate controls: ${errorMessage}`, 
        {
          type: 'generation',
          generationStatus: 'failed',
        }
      );
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
        isGenerating={isGenerating}
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
