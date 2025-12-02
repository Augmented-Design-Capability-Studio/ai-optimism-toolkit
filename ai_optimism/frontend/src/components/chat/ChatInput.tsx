'use client';

import { MarkdownInput } from '../shared/chat';

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ 
  input, 
  onInputChange, 
  onSubmit, 
  isLoading,
  disabled = false
}: ChatInputProps) {
  return (
    <MarkdownInput
      value={input}
      onChange={onInputChange}
      onSubmit={onSubmit}
      placeholder="Describe your optimization problem..."
      disabled={disabled}
      isLoading={isLoading}
      showAIButton={false}
    />
  );
}
