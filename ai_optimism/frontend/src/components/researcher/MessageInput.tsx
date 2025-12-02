/**
 * Input area for researcher to send messages
 * Discord-style markdown formatting: syntax visible, content formatted
 */

import { useState, useRef, useEffect } from 'react';
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

// Helper to apply Discord-style formatting: keep syntax, format content
function applyDiscordFormatting(element: HTMLElement) {
  const text = element.textContent || '';
  
  // Save cursor position more accurately
  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  
  // Calculate absolute cursor position in the text
  let cursorOffset = 0;
  if (range) {
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    cursorOffset = preCaretRange.toString().length;
  }
  
  // Parse and format markdown - keep syntax visible, format content inside
  let html = text
    // Escape HTML first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Strikethrough: ~~text~~ -> keep ~~, format text
    .replace(/~~(.+?)~~/g, '~~<del>$1</del>~~')
    // Bold: **text** -> keep **, format text
    .replace(/\*\*(.+?)\*\*/g, '**<strong>$1</strong>**')
    .replace(/__(.+?)__/g, '__<strong>$1</strong>__')
    // Inline code: `code` -> keep `, format code
    .replace(/`([^`]+?)`/g, '`<code>$1</code>`')
    // Italic: *text* -> keep *, format text (simpler regex)
    .replace(/(^|\s)\*([^*\n]+?)\*(\s|$)/g, '$1*<em>$2</em>*$3')
    .replace(/(^|\s)_([^_\n]+?)_(\s|$)/g, '$1_<em>$2</em>_$3')
    // Line breaks
    .replace(/\n/g, '<br>');
  
  element.innerHTML = html;
  
  // Restore cursor position
  if (range && selection && cursorOffset >= 0) {
    try {
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null
      );
      let node;
      let offset = 0;
      while ((node = walker.nextNode())) {
        const nodeLength = node.textContent?.length || 0;
        if (offset + nodeLength >= cursorOffset) {
          const newRange = document.createRange();
          const pos = Math.min(cursorOffset - offset, nodeLength);
          newRange.setStart(node, pos);
          newRange.setEnd(node, pos);
          selection.removeAllRanges();
          selection.addRange(newRange);
          break;
        }
        offset += nodeLength;
      }
    } catch (e) {
      // Cursor restoration failed, that's okay
    }
  }
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
  const editorRef = useRef<HTMLDivElement>(null);

  // Update editor content when input changes externally (e.g., from AI)
  useEffect(() => {
    if (editorRef.current && editorRef.current.textContent !== input) {
      editorRef.current.textContent = input;
      if (input) {
        applyDiscordFormatting(editorRef.current);
      }
    }
  }, [input]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const text = element.textContent || '';
    setInput(text);
    
    // Apply Discord-style formatting (keeps syntax visible)
    // Use requestAnimationFrame to reduce cursor jumping
    if (text) {
      requestAnimationFrame(() => {
        applyDiscordFormatting(element);
      });
    } else {
      element.innerHTML = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
    // Shift+Enter adds new line (default behavior)
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    
    onSendMessage(sessionId, input);
    setInput('');
    if (editorRef.current) {
      editorRef.current.textContent = '';
      editorRef.current.innerHTML = '';
    }
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
      if (editorRef.current) {
        editorRef.current.textContent = aiResponseText;
        applyDiscordFormatting(editorRef.current);
      }
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
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          p: 1.5, // Reduced padding for space savings
          display: 'flex',
          gap: 1,
          alignItems: 'flex-end',
        }}
      >
        <Box
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          suppressContentEditableWarning
          data-placeholder="Type your response..."
          sx={{
            flex: 1,
            minHeight: '40px',
            maxHeight: '150px',
            overflowY: 'auto',
            p: '8px 12px',
            border: '1px solid',
            borderColor: disabled ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.23)',
            borderRadius: '4px',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            outline: 'none',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            bgcolor: disabled ? 'rgba(0, 0, 0, 0.06)' : 'transparent',
            cursor: disabled ? 'not-allowed' : 'text',
            '&:focus': {
              borderColor: 'primary.main',
              borderWidth: '2px',
            },
            '&:empty:before': {
              content: 'attr(data-placeholder)',
              color: 'rgba(0, 0, 0, 0.38)',
              pointerEvents: 'none',
            },
            // Markdown formatting styles - syntax visible, content formatted
            '& strong': {
              fontWeight: 'bold',
            },
            '& em': {
              fontStyle: 'italic',
            },
            '& code': {
              bgcolor: 'rgba(0, 0, 0, 0.08)',
              px: 0.5,
              py: 0.25,
              borderRadius: '3px',
              fontFamily: 'monospace',
              fontSize: '0.9em',
            },
            '& del': {
              textDecoration: 'line-through',
              opacity: 0.7,
            },
            '& br': {
              lineHeight: '1.5',
            },
          }}
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
    </Box>
  );
}
