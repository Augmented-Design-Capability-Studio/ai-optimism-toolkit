/**
 * Input area for researcher to send messages
 * Uses shared MarkdownInput component with custom toolbar
 */

import { useState } from 'react';
import { Box } from '@mui/material';
import { MarkdownInput } from '../core/components/shared/chat';
import { ResearcherToolbar } from './ResearcherToolbar';
import { 
  filterMessagesForAIResponse, 
  filterMessagesForComponent,
  filterMessagesForDraftFormatting,
  formatMessagesAsConversation 
} from '../core/utils/messageFiltering';
import { useSessionManager, type Session } from '../core/services/sessionManager';

interface MessageInputProps {
  sessionId: string;
  session?: Session | null; // Session with messages for filtering
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
}

export function MessageInput({ 
  sessionId,
  session,
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
}: MessageInputProps) {
  const [input, setInput] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isGeneratingComponent, setIsGeneratingComponent] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const sessionManager = useSessionManager();

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
    if (!hasAIConfig || isGeneratingAI) return;
    
    setIsGeneratingAI(true);
    try {
      // Get session messages for filtering
      const currentSession = session || await sessionManager.getSession(sessionId);
      const messages = currentSession?.messages || [];
      
      // Filter messages based on whether we're formatting a draft or generating full response
      let filteredMessages: typeof messages = [];
      if (input.trim()) {
        // Draft formatting: only need recent context
        filteredMessages = filterMessagesForDraftFormatting(messages);
      } else {
        // Full response: filter to reasonable size
        filteredMessages = filterMessagesForAIResponse(messages);
      }
      
      const requestBody: { draft?: string; messages?: typeof messages } = {};
      
      if (input.trim()) {
        requestBody.draft = input.trim();
      }
      
      // Include filtered messages in request
      if (filteredMessages.length > 0) {
        requestBody.messages = filteredMessages;
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

  const handleComponentGenerate = async (component: 'variables' | 'properties' | 'objectives' | 'constraints') => {
    if (!hasAIConfig || isGeneratingComponent) return;

    setIsGeneratingComponent(component);
    try {
      // Get session messages for filtering
      const currentSession = session || await sessionManager.getSession(sessionId);
      const messages = currentSession?.messages || [];
      
      // Filter messages for component generation (smart filtering based on component type)
      const filteredMessages = filterMessagesForComponent(messages, component);
      
      const response = await fetch(`/api/sessions/${sessionId}/formalize/component`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          component,
          messages: filteredMessages.length > 0 ? filteredMessages : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to generate ${component}`);
      }

      const data = await response.json();

      // Check for validation errors
      if (data.validation?.errors && data.validation.errors.length > 0) {
        alert(`Cannot generate ${component}: ${data.validation.errors.join(', ')}`);
        return;
      }

      // Format the response: summary + JSON
      if (data.data && data.data[component]) {
        const jsonString = JSON.stringify(data.data, null, 2);
        const formattedText = `${data.summary || `Generated ${component} for the optimization problem`}\n\n\`\`\`json\n${jsonString}\n\`\`\``;
        setInput(formattedText);
      } else {
        throw new Error(`No ${component} data received from server`);
      }
    } catch (error: any) {
      console.error(`[MessageInput] Error generating ${component}:`, error);
      alert(`Failed to generate ${component}: ${error.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingComponent(null);
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
        onFormalize={onFormalize ? () => onFormalize(sessionId) : undefined}
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
