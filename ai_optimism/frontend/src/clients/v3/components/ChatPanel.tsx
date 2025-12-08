'use client';

import { Paper, Box, Alert, Button } from '@mui/material';
import { useRef } from 'react';
import {
  ChatHeader,
  MessagesList,
  ChatInput,
} from '@/core/components/chat';
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
    sessionTerminated,
    sessionDeleted,
    createNewSession,
    handleSubmit,
  } = useChatSession();

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ChatHeader mode={mode} session={currentSession} />

      {sessionTerminated && !sessionDeleted && (
        <Alert severity="info" sx={{ m: 2 }}>
          Your session was ended by a researcher. Starting a fresh conversation.
        </Alert>
      )}

      {sessionDeleted && (
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
        disabled={sessionDeleted}
      />
    </Paper>
  );
}

