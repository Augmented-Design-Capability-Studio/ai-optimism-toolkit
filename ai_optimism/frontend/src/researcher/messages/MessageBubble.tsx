/**
 * Main message bubble component that routes to specific message types
 */

import { Box, Avatar, Paper, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import ScienceIcon from '@mui/icons-material/Science';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { Message } from '../../core/services/sessionManager';
import {
  isSpecialMessageType,
  isShortMessage,
  getMessageSenderLabel,
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
  onGenerateControls?: (jsonData: any) => void;
  isGeneratingControls?: boolean;
}

export function MessageBubble({ 
  message, 
  onGenerateControls,
  isGeneratingControls = false,
}: MessageBubbleProps) {
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
        }}
      >
        {message.sender === 'user' ? (
          <PersonIcon sx={{ fontSize: 20, color: 'white' }} />
        ) : message.sender === 'researcher' ? (
          <ScienceIcon sx={{ fontSize: 20, color: 'white' }} />
        ) : (
          <SmartToyIcon sx={{ fontSize: 20, color: 'white' }} />
        )}
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
          <NormalMessageBubble 
            message={message} 
            onGenerateControls={onGenerateControls}
            isGeneratingControls={isGeneratingControls}
          />
        )}
      </Paper>
    </Box>
  );
}

