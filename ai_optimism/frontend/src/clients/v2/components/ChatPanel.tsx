'use client';

import { Paper, Box } from '@mui/material';
import { useRef } from 'react';
import {
  ChatHeader,
  MessagesList,
  ChatInput,
} from '../../../core/components/chat';
import { useChatSession } from '../hooks/useChatSession';

interface ChatPanelProps {
  onControlsGenerated?: (controls: unknown) => void;
}

export function ChatPanel({ onControlsGenerated }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const {
    input,
    setInput,
    currentSession,
    mode,
    displayMessages,
    isLoading,
    isWaitingForResearcher,
    handleSubmit,
  } = useChatSession();

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ChatHeader mode={mode} session={currentSession} />
      <MessagesList
        messages={displayMessages}
        mode={mode}
        apiKey={null}
        isLoading={isLoading}
        messagesEndRef={messagesEndRef}
        messagesContainerRef={messagesContainerRef}
        isWaitingForResearcher={isWaitingForResearcher}
      />
      <ChatInput
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </Paper>
  );
}

