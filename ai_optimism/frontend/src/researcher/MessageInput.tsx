/**
 * Input area for researcher to send messages
 * Uses shared MarkdownInput component with custom toolbar
 */

import { useState } from 'react';
import { Box } from '@mui/material';
import { MarkdownInput } from '../core/components/shared/chat';
import { ResearcherToolbar } from './ResearcherToolbar';

interface MessageInputProps {
  sessionId: string;
  onSendMessage: (sessionId: string, message: string, metadata?: any) => void;
  onRequestAIResponse?: (sessionId: string) => void;
  disabled?: boolean;
  sessionStatus?: 'active' | 'waiting' | 'formalized' | 'completed';
  readyToFormalize?: boolean;
  isFormalizing?: boolean;
  hasAIConfig?: boolean;
  onToggleReadyToFormalize?: () => void;
  onFormalize?: (sessionId: string) => void;
  onResetFormalization?: (sessionId: string) => void;
  sessionMessages?: Array<{ sender: string; content: string; role?: string }>;
}

export function MessageInput({ 
  sessionId, 
  onSendMessage, 
  onRequestAIResponse,
  disabled,
  sessionStatus,
  readyToFormalize = false,
  isFormalizing = false,
  hasAIConfig = false,
  onToggleReadyToFormalize,
  onFormalize,
  onResetFormalization,
  sessionMessages = [],
}: MessageInputProps) {
  const [input, setInput] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isGeneratingComponent, setIsGeneratingComponent] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    
    // Try to extract JSON from the message content
    // If it contains a JSON block, parse it and send with metadata
    const jsonMatch = input.match(/```json\s*([\s\S]*?)\s*```/);
    let metadata: any = undefined;
    
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        // Check if it's a component (has variables, properties, objectives, or constraints)
        if (parsed.variables || parsed.properties || parsed.objectives || parsed.constraints) {
          // Determine the appropriate metadata type based on which components are present
          // Use incremental update types so the aggregator can merge them properly
          let updateType: 'variables-update' | 'objectives-update' | 'constraints-update' | 'properties-update' | 'formalization' | undefined;
          
          // Check which components are present
          const hasVariables = parsed.variables && Array.isArray(parsed.variables) && parsed.variables.length > 0;
          const hasObjectives = parsed.objectives && Array.isArray(parsed.objectives) && parsed.objectives.length > 0;
          const hasConstraints = parsed.constraints && Array.isArray(parsed.constraints) && parsed.constraints.length > 0;
          const hasProperties = parsed.properties && Array.isArray(parsed.properties) && parsed.properties.length > 0;
          
          // Count how many component types are present
          const componentCount = [hasVariables, hasObjectives, hasConstraints, hasProperties].filter(Boolean).length;
          
          // If it's a complete formalization (has variables + objectives at minimum), use 'formalization'
          // Otherwise, use incremental update type based on primary component
          if (componentCount >= 2 && hasVariables && hasObjectives) {
            // Complete formalization - use formalization type
            updateType = 'formalization';
          } else if (hasVariables) {
            // Primary component is variables
            updateType = 'variables-update';
          } else if (hasObjectives) {
            updateType = 'objectives-update';
          } else if (hasConstraints) {
            updateType = 'constraints-update';
          } else if (hasProperties) {
            updateType = 'properties-update';
          }
          
          if (updateType) {
            metadata = {
              type: updateType,
              structuredData: parsed,
            };
          }
        }
      } catch (e) {
        // Not valid JSON, send as normal message
      }
    }
    
    // Call onSendMessage with content and optional metadata
    onSendMessage(sessionId, input, metadata);
    setInput('');
  };

  const handleRequestAI = async () => {
    // Dummy button - functionality to be implemented later
    console.log('[MessageInput] AI Response button clicked', { 
      sessionId, 
      hasAIConfig,
      messageCount: sessionMessages.length 
    });
  };

  const handleComponentGenerate = (component: 'variables' | 'properties' | 'objectives' | 'constraints') => {
    // Dummy button - just log for now
    console.log('[MessageInput] Component generation button clicked', { 
      sessionId, 
      component,
      hasAIConfig 
    });
    // TODO: Implement component generation
  };

  const handleFormalize = async () => {
    if (!hasAIConfig || isFormalizing || disabled) {
      return;
    }

    setIsGeneratingAI(true);
    try {
      // Create messages array with formalize prompt
      const formalizePrompt = "Please formalize this optimization problem based on our conversation. Provide a complete structured problem definition with variables, objectives, constraints, and properties in JSON format.";
      
      // Convert session messages to chat format and add formalize prompt
      const chatMessages = [
        ...sessionMessages.map((msg) => ({
          role: msg.role || (msg.sender === 'user' ? 'user' : msg.sender === 'researcher' ? 'user' : 'assistant'),
          content: msg.content,
        })),
        {
          role: 'user' as const,
          content: formalizePrompt,
        },
      ];

      // Use the chat stream endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: chatMessages,
          sessionId: sessionId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to stream formalization: ${response.statusText}`);
      }

      // Stream the response into the input box
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          // Parse complete lines from the buffer
          const lines = buffer.split('\n');
          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() && line.startsWith('0:')) {
              try {
                // Extract the text content from the stream format
                // Format is: 0:"text content" or 0:{"text":"content"}
                const contentMatch = line.match(/^0:(.+)$/);
                if (contentMatch) {
                  const content = contentMatch[1].trim();
                  
                  // Try parsing as JSON string first
                  let text = '';
                  try {
                    const parsed = JSON.parse(content);
                    if (typeof parsed === 'string') {
                      text = parsed;
                    } else if (parsed && typeof parsed === 'object' && parsed.text) {
                      text = parsed.text;
                    }
                  } catch {
                    // Not JSON, try as quoted string
                    const stringMatch = content.match(/^"(.*)"$/);
                    if (stringMatch) {
                      // Unescape the string
                      text = stringMatch[1]
                        .replace(/\\n/g, '\n')
                        .replace(/\\"/g, '"')
                        .replace(/\\\\/g, '\\')
                        .replace(/\\r/g, '\r')
                        .replace(/\\t/g, '\t');
                    } else {
                      // Plain text (shouldn't happen but handle it)
                      text = content;
                    }
                  }
                  
                  if (text) {
                    setInput(text);
                  }
                }
              } catch (e) {
                console.warn('[MessageInput] Error parsing stream chunk:', e, line);
              }
            }
          }
        }
        
        // Process any remaining buffer content
        if (buffer.trim() && buffer.startsWith('0:')) {
          try {
            const contentMatch = buffer.match(/^0:(.+)$/);
            if (contentMatch) {
              const parsed = JSON.parse(contentMatch[1].trim());
              if (typeof parsed === 'string') {
                setInput(parsed);
              }
            }
          } catch (e) {
            // Ignore parsing errors for incomplete buffer
          }
        }
      }
    } catch (error: any) {
      console.error('[MessageInput] Error streaming formalization:', error);
      alert(`Failed to formalize problem: ${error.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <Box>
      <ResearcherToolbar
        sessionId={sessionId}
        hasAIConfig={hasAIConfig}
        disabled={disabled}
        sessionStatus={sessionStatus}
        readyToFormalize={readyToFormalize}
        isFormalizing={isFormalizing}
        showPreview={showPreview}
        onPreviewChange={setShowPreview}
        onAIResponse={handleRequestAI}
        onComponentGenerate={handleComponentGenerate}
        onToggleReadyToFormalize={onToggleReadyToFormalize}
        onFormalize={handleFormalize}
        onResetFormalization={onResetFormalization ? () => onResetFormalization(sessionId) : undefined}
        isGeneratingAI={isGeneratingAI}
        isGeneratingComponent={isGeneratingComponent}
      />
      <MarkdownInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        placeholder="Type your response..."
        disabled={disabled}
        isLoading={false}
        showAIButton={false}
        showPreview={showPreview}
        onPreviewChange={setShowPreview}
      />
    </Box>
  );
}
