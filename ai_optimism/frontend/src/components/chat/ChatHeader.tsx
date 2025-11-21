'use client';

import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import { Session } from '../../services/sessionManager';

interface ChatHeaderProps {
  mode?: string;
  session?: Session | null;
}

export function ChatHeader({ mode, session }: ChatHeaderProps) {
  const handleShare = async () => {
    if (!session) return;

    const url = `${window.location.origin}${window.location.pathname}?session=${session.id}`;

    try {
      await navigator.clipboard.writeText(url);
      alert('Session URL copied to clipboard! Share this link to continue the conversation on another device.');
    } catch (error) {
      console.error('Failed to copy URL:', error);
      // Fallback: show the URL in a prompt
      prompt('Copy this URL to share the session:', url);
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Box>
        <Typography variant="h6" fontWeight="bold">
          💬 Chat Assistant
        </Typography>
        <Typography variant="caption">
          We will guide you through the optimization process
        </Typography>
      </Box>

      {session && (
        <Tooltip title="Share session link">
          <IconButton
            onClick={handleShare}
            sx={{ color: 'primary.contrastText' }}
            size="small"
          >
            <ShareIcon />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
