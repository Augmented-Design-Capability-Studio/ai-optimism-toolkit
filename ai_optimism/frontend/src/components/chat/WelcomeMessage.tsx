'use client';

import { Box, Paper, Typography, Avatar } from '@mui/material';
import { SessionMode } from '../../services/sessionManager';

interface WelcomeMessageProps {
  mode: SessionMode;
  apiKey: string | null;
}

export function WelcomeMessage({ mode, apiKey }: WelcomeMessageProps) {
  // Show connection prompt if no API key
  if (!apiKey) {
    return (
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          alignItems: 'flex-start',
        }}
      >
        <Avatar
          sx={{
            bgcolor: 'warning.main',
            width: 32,
            height: 32,
          }}
        >
          ⚠️
        </Avatar>
        <Paper
          elevation={1}
          sx={{
            p: 2,
            maxWidth: '80%',
            bgcolor: 'warning.light',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {`Please connect to an AI provider first!

Click the "AI Connection" button in the top-right corner to configure your API key.`}
          </Typography>
        </Paper>
      </Box>
    );
  }

  // Standard welcome message
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'flex-start',
      }}
    >
      <Avatar
        sx={{
          bgcolor: 'secondary.main',
          width: 32,
          height: 32,
        }}
      >
        🤖
      </Avatar>
      <Paper
        elevation={1}
        sx={{
          p: 2,
          maxWidth: '80%',
          bgcolor: 'grey.100',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {`Welcome to the AI Optimism Toolkit! 👋

I'll help you design your optimization problem. Let's start by understanding what you're trying to optimize.

What problem would you like to solve? For example:
• Optimize a recipe
• Minimize manufacturing costs
• Maximize energy efficiency
• Design an optimal schedule

Describe your problem, and I'll help you define variables, constraints, and objectives.`}
        </Typography>
        </Paper>
      </Box>
    );
}
