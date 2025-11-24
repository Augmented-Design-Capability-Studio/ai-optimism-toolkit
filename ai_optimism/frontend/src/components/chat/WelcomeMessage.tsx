'use client';

import { Box, Paper, Typography, Avatar } from '@mui/material';
import { SessionMode } from '../../services/sessionManager';

interface WelcomeMessageProps {
  mode: SessionMode;
  apiKey: string | null;
}

export function WelcomeMessage({ mode, apiKey }: WelcomeMessageProps) {
  // Reference apiKey to avoid unused warnings while warning bubble is disabled
  void apiKey;
  // Temporarily hide the API key warning bubble per request
  // if (!apiKey) {
  //   return (
  //     <Box
  //       sx={{
  //         display: 'flex',
  //         gap: 1,
  //         alignItems: 'flex-start',
  //       }}
  //     >
  //       <Avatar
  //         sx={{
  //           bgcolor: 'warning.main',
  //           width: 32,
  //           height: 32,
  //         }}
  //       >
  //         ⚠️
  //       </Avatar>
  //       <Paper
  //         elevation={1}
  //         sx={{
  //           p: 2,
  //           maxWidth: '80%',
  //           bgcolor: 'warning.light',
  //         }}
  //       >
  //         <Typography
  //           variant="body2"
  //           sx={{
  //             whiteSpace: 'pre-wrap',
  //             wordBreak: 'break-word',
  //           }}
  //         >
  //           {`Please connect to an AI provider first!
  //
  // Click the "AI Connection" button in the top-left corner to configure your API key.`}
  //         </Typography>
  //       </Paper>
  //     </Box>
  //   );
  // }

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
          {`Hello! I'm here to help you design an optimization problem. To get started, let's think about what you're trying to optimize.

We can break it down into a few steps:

• Variables: What are the things you can change or decide upon? These are the "levers" you can pull.
• Properties: Are there any values that are calculated based on your variables?
• Objectives: What do you want to achieve? Are you trying to maximize something (like profit) or minimize something (like cost or time)?
• Constraints: What are the limits, rules, or requirements that your solution must satisfy?

Let's start with the first step: What are the variables in your problem? What can you change or decide upon?`}
        </Typography>
        </Paper>
      </Box>
    );
}
