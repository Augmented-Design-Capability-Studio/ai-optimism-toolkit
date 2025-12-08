/**
 * Message list displaying conversation
 * Container component that handles scrolling and renders message bubbles
 */

import { Box } from '@mui/material';
import { useEffect, useRef } from 'react';
import { Message } from '../core/services/sessionManager';
import { MessageBubble, FormalizingIndicator } from './messages';

interface MessageListProps {
  messages: Message[];
  isFormalizingSession?: boolean;
  onGenerateControls?: (jsonData: any) => void;
  isGeneratingControls?: boolean;
}

export function MessageList({ 
  messages, 
  isFormalizingSession,
  onGenerateControls,
  isGeneratingControls = false,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(messages.length);

  // Auto-scroll to bottom only when new messages are added
  useEffect(() => {
    const currentMessageCount = messages.length;
    if (currentMessageCount > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = currentMessageCount;
  }, [messages]);
  
  return (
    <Box sx={{ flex: 1, overflow: 'auto', p: 2, pb: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {messages.map((message) => (
        <MessageBubble 
          key={message.id} 
          message={message}
          onGenerateControls={onGenerateControls}
          isGeneratingControls={isGeneratingControls}
        />
      ))}

      {isFormalizingSession && <FormalizingIndicator />}
      
      {/* Invisible element to scroll to */}
      <div ref={messagesEndRef} />
    </Box>
  );
}
