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
    if (!onRequestAIResponse || isGeneratingAI) return;
    
    setIsGeneratingAI(true);
    try {
      await onRequestAIResponse(sessionId);
    } catch (error) {
      console.error('[MessageInput] Error requesting AI response:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const isAIButtonDisabled = 
    !onRequestAIResponse ||
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
      {onRequestAIResponse && (
        <Tooltip 
          title={
            !hasAIConfig 
              ? "AI provider not configured for this session"
              : isGeneratingAI
              ? "Generating AI response..."
              : "Request AI response on client's behalf"
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
