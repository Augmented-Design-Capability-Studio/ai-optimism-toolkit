/**
 * Input area for researcher to send messages
 */

import { useState } from 'react';
import { Box, TextField, IconButton, Tooltip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
    // Shift+Enter adds new line (default behavior)
  };

  const handleRequestAI = async () => {
    if (!hasAIConfig || isGeneratingAI) return;
    
    setIsGeneratingAI(true);
    try {
      // Call API directly to get AI response
      const requestBody: { draft?: string } = {};
      
      // If input has text, send it for formatting; otherwise draft new message
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

      // Put the AI response in the input box instead of sending it
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
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: 2,
        borderTop: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        gap: 1,
        alignItems: 'flex-end',
      }}
    >
      <TextField
        fullWidth
        multiline
        maxRows={6}
        minRows={1}
        size="small"
        placeholder="Type your response..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      {hasAIConfig && (
        <Tooltip 
          title={
            isGeneratingAI
              ? input.trim()
                ? "Formatting your draft..."
                : "Drafting AI response..."
              : input.trim()
              ? "Format and improve your draft text"
              : "Draft an AI response based on conversation"
          }
          arrow
        >
          <span>
            <IconButton
              color="secondary"
              onClick={handleRequestAI}
              disabled={isAIButtonDisabled}
              sx={{
                opacity: isGeneratingAI ? 0.6 : 1,
              }}
            >
              <AutoAwesomeIcon />
            </IconButton>
          </span>
        </Tooltip>
      )}
      <IconButton 
        type="submit" 
        color="primary" 
        disabled={!input.trim() || disabled}
      >
        <SendIcon />
      </IconButton>
    </Box>
  );
}
