/**
 * Normal message bubble for regular user/researcher/AI messages
 * Uses shared NormalMessageContent component
 */

import { Message } from '../../core/services/sessionManager';
import { NormalMessageContent } from '../../core/components/shared/chat';

interface NormalMessageBubbleProps {
  message: Message;
  onGenerateControls?: (jsonData: any) => void;
  isGeneratingControls?: boolean;
}

export function NormalMessageBubble({ 
  message, 
  onGenerateControls,
  isGeneratingControls = false,
}: NormalMessageBubbleProps) {
  return (
    <NormalMessageContent
      content={message.content}
      variant="default"
      onGenerateControls={onGenerateControls}
      isGeneratingControls={isGeneratingControls}
    />
  );
}

