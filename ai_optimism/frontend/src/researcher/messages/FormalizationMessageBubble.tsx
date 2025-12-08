/**
 * Formalization message bubble with accordion
 */

import { Message } from '../../core/services/sessionManager';
import { FormalizationMessage } from '../../core/components/shared/chat';

interface FormalizationMessageBubbleProps {
  message: Message;
}

export function FormalizationMessageBubble({ message }: FormalizationMessageBubbleProps) {
  return (
    <FormalizationMessage
      content={message.content}
      isIncomplete={message.metadata?.incomplete}
      isError={!!message.metadata?.errorDetails}
      errorDetails={message.metadata?.errorDetails as string | undefined}
      variant="default"
      structuredData={message.metadata?.structuredData}
      validation={message.metadata?.validation}
    />
  );
}

