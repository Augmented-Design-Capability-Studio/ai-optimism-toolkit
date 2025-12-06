/**
 * Controls generation message bubble
 */

import { Box, Chip, CircularProgress, Typography } from '@mui/material';
import { Message } from '../../core/services/sessionManager';
import { NormalMessageBubble } from './NormalMessageBubble';

interface ControlsGenerationMessageBubbleProps {
  message: Message;
}

export function ControlsGenerationMessageBubble({ message }: ControlsGenerationMessageBubbleProps) {
  return (
    <>
      {/* Show chips for controls-generation messages */}
      <Box sx={{ mb: 1 }}>
        {message.metadata?.controlsGenerated && (
          <Chip label="🎛️ Controls Generated" size="small" color="secondary" />
        )}
        {message.metadata?.controlsError && (
          <Chip label="❌ Generation Failed" size="small" color="error" />
        )}
      </Box>

      {/* Show thinking indicator during generation */}
      {!message.metadata?.controlsGenerated && !message.metadata?.controlsError && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <CircularProgress size={16} thickness={5} />
          <Typography variant="body2" color="text.secondary">
            Generating controls...
          </Typography>
        </Box>
      )}

      {/* Show normal message content */}
      <NormalMessageBubble message={message} />
    </>
  );
}

