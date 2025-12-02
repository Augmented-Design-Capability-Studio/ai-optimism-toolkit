/**
 * Normal message bubble for regular user/researcher/AI messages
 * Supports JSON block extraction and collapsible display (like client side)
 */

import { Box } from '@mui/material';
import { Message } from '../../../services/sessionManager';
import { MarkdownContent, splitTextWithJSON, JSONBlockCollapsible } from '../../shared/chat';

interface NormalMessageBubbleProps {
  message: Message;
}

export function NormalMessageBubble({ message }: NormalMessageBubbleProps) {
  // Split content into parts with JSON blocks (like client side)
  const contentParts = splitTextWithJSON(message.content);
  const hasJSON = contentParts.some(p => p.type === 'json');

  // If no JSON blocks, render simple markdown
  if (!hasJSON) {
    return <MarkdownContent content={message.content} variant="default" />;
  }

  // If JSON blocks exist, render with collapsible JSON sections
  return (
    <Box>
      {contentParts.map((part, index) => {
        if (part.type === 'json') {
          return (
            <JSONBlockCollapsible key={`json-${index}`} jsonContent={part.content} />
          );
        } else {
          return (
            <MarkdownContent
              key={`text-${index}`}
              content={part.content}
              variant="default"
            />
          );
        }
      })}
    </Box>
  );
}

