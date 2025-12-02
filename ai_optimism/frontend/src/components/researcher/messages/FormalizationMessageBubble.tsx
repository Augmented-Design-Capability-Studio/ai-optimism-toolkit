/**
 * Formalization message bubble with accordion
 */

import { Message } from '../../../services/sessionManager';
import { FormalizationMessage } from '../../shared/messages';

interface FormalizationMessageBubbleProps {
  message: Message;
}

export function FormalizationMessageBubble({ message }: FormalizationMessageBubbleProps) {
  return (
    <FormalizationMessage
      content={message.content}
      isIncomplete={message.metadata?.incomplete}
      variant="default"
    />
  );
}

