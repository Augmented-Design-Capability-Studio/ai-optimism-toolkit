/**
 * Input area for researcher to send messages
 * Uses shared MarkdownInput component
 */

import { useState } from 'react';
import { MarkdownInput } from '../shared/chat';

interface MessageInputProps {
  sessionId: string;
  onSendMessage: (sessionId: string, message: string) => void;
  onRequestAIResponse?: (sessionId: string) => void;
  disabled?: boolean;
  sessionStatus?: 'active' | 'waiting' | 'formalized' | 'completed';
  hasAIConfig?: boolean;
}

export function MessageInput({ 
  sessionId, 
  onSendMessage, 
  onRequestAIResponse,
  disabled,
  sessionStatus,
  hasAIConfig = false,
}: MessageInputProps) {
  const [input, setInput] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    
    onSendMessage(sessionId, input);
    setInput('');
  };

  const handleRequestAI = async () => {
    if (!hasAIConfig || isGeneratingAI) return;
    
    setIsGeneratingAI(true);
    try {
      const requestBody: { draft?: string } = {};
      
      if (input.trim()) {
        requestBody.draft = input.trim();
      }
      
      const response = await fetch(`/api/sessions/${sessionId}/ai-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate AI response');
      }

      const data = await response.json();
      const aiResponseText = data.response;

      if (!aiResponseText) {
        throw new Error('No response received from AI');
      }

      setInput(aiResponseText);
    } catch (error: any) {
      console.error('[MessageInput] Error requesting AI response:', error);
      alert(`Failed to generate AI response: ${error.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const isAIButtonDisabled = 
    !hasAIConfig ||
    isGeneratingAI ||
    disabled ||
    sessionStatus === 'completed' ||
    sessionStatus === 'formalized';

  return (
    <MarkdownInput
      value={input}
      onChange={setInput}
      onSubmit={handleSubmit}
      placeholder="Type your response..."
      disabled={disabled}
      isLoading={false}
      showAIButton={hasAIConfig}
      onRequestAI={handleRequestAI}
      isGeneratingAI={isGeneratingAI}
      aiButtonDisabled={isAIButtonDisabled}
      aiButtonTooltip={
        isGeneratingAI
          ? input.trim()
            ? "Formatting your draft..."
            : "Drafting AI response..."
          : input.trim()
          ? "Format and improve your draft text"
          : "Draft an AI response based on conversation"
      }
    />
  );
}
