'use client';

import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { MarkdownInput } from '../shared/chat';

interface ChatInputProps {
  input: number; // Clear counter - increments when input should be reset
  onInputChange?: (value: string) => void; // Updates ref in parent
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export const ChatInput = memo(function ChatInput({ 
  input: clearCounter, 
  onInputChange,
  onSubmit, 
  isLoading,
  disabled = false
}: ChatInputProps) {
  // Manage input state locally to prevent parent re-renders on every keystroke
  const [localInput, setLocalInput] = useState('');
  const lastClearCounterRef = useRef(clearCounter);
  
  // Reset input when clear counter changes (after submit)
  useEffect(() => {
    if (clearCounter !== lastClearCounterRef.current) {
      lastClearCounterRef.current = clearCounter;
      setLocalInput('');
    }
  }, [clearCounter]);
  
  // Handle input changes locally
  const handleInputChange = useCallback((value: string) => {
    setLocalInput(value);
    // Optionally notify parent, but don't require it
    onInputChange?.(value);
  }, [onInputChange]);
  
  // Handle submit - parent will clear input via initialInput prop
  const handleSubmit = useCallback((e: React.FormEvent) => {
    onSubmit(e);
    // Input will be cleared by parent, which will sync via useEffect above
  }, [onSubmit]);
  
  return (
    <MarkdownInput
      value={localInput}
      onChange={handleInputChange}
      onSubmit={handleSubmit}
      placeholder="Describe your optimization problem..."
      disabled={disabled}
      isLoading={isLoading}
      showAIButton={false}
    />
  );
});
