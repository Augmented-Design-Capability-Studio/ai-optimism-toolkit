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
  const [localIsFormalizing, setLocalIsFormalizing] = useState(false);

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

  const handleComponentGenerate = async (component: 'variables' | 'properties' | 'objectives' | 'constraints') => {
    if (!hasAIConfig || isGeneratingComponent === component || disabled) {
      return;
    }

    setIsGeneratingComponent(component);
    try {
      // Send trigger message - client will handle the actual generation through chat stream
      // This simulates the client requesting component generation
      const componentLabels = {
        variables: 'Variables',
        properties: 'Properties',
        objectives: 'Objectives',
        constraints: 'Constraints',
      };
      
      await onSendMessage(
        sessionId,
        `Component generation requested by system: ${componentLabels[component]}. Missing values will be filled with reasonable sample/starting point values.`,
        {
          type: 'trigger-generate-component',
          component: component,
        }
      );
      
      // The client's chat system will detect this message and trigger component generation
      // No API calls needed - the client handles it through its existing chat stream mechanism
    } catch (error: any) {
      console.error('[MessageInput] Error triggering component generation:', error);
      alert(`Failed to trigger ${component} generation: ${error.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingComponent(null);
    }
  };

  const handleFormalize = async () => {
    if (!hasAIConfig || isFormalizing || localIsFormalizing || disabled) {
      return;
    }

    setLocalIsFormalizing(true);
    try {
      // Instead of making API calls, add a message with special metadata
      // that signals the client to trigger formalization
      // This simulates the client clicking the formalize button
      await onSendMessage(
        sessionId,
        'Formalization requested by system.',
        {
          type: 'trigger-formalize',
          triggerAction: 'formalize',
        }
      );
      
      // The client's chat system will detect this message and trigger formalization
      // No API calls needed - the client handles it through its existing mechanism
    } catch (error: any) {
      console.error('[MessageInput] Error triggering formalization:', error);
      alert(`Failed to trigger formalization: ${error.message || 'Unknown error'}`);
    } finally {
      setLocalIsFormalizing(false);
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
        isFormalizing={isFormalizing || localIsFormalizing}
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
