/**
 * Main message bubble component that routes to specific message types
 */

import { Box, Avatar, Paper, Typography } from '@mui/material';
import { Message } from '../../../services/sessionManager';
import {
  isSpecialMessageType,
  isShortMessage,
  getMessageSenderLabel,
  getAvatarEmoji,
  getAvatarColor,
  getMessageBubbleColor,
  getMessageBubbleBorder,
} from './utils/messageHelpers';
import { NormalMessageBubble } from './NormalMessageBubble';
import { FormalizationMessageBubble } from './FormalizationMessageBubble';
import { OptimizationRunMessageBubble } from './OptimizationRunMessageBubble';
import { ControlsGenerationMessageBubble } from './ControlsGenerationMessageBubble';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isSpecialType = isSpecialMessageType(message);
  const isShort = isShortMessage(message);

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'flex-start',
        flexDirection: message.sender === 'user' ? 'row' : 'row-reverse',
      }}
    >
      <Avatar
        sx={{
          bgcolor: getAvatarColor(message),
          width: 32,
          height: 32,
          fontSize: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {getAvatarEmoji(message)}
      </Avatar>
      <Paper
        elevation={1}
        sx={{
          p: 2,
          maxWidth: isSpecialType ? '70%' : isShort ? 'fit-content' : '70%',
          width: isSpecialType ? '70%' : isShort ? 'auto' : '70%',
          bgcolor: getMessageBubbleColor(message),
          ...getMessageBubbleBorder(message),
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          {getMessageSenderLabel(message)}
        </Typography>

        {/* Route to specific message type component */}
        {message.metadata?.type === 'optimization-run' ? (
          <OptimizationRunMessageBubble message={message} />
        ) : message.metadata?.type === 'formalization' ? (
          <FormalizationMessageBubble message={message} />
        ) : message.metadata?.type === 'controls-generation' ? (
          <ControlsGenerationMessageBubble message={message} />
        ) : (
          <NormalMessageBubble message={message} />
        )}
      </Paper>
    </Box>
  );
}

