/**
 * Shared markdown content renderer
 * Wraps ReactMarkdown with consistent styling
 */

import { Box, SxProps, Theme } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownStyles, markdownStylesLight } from './utils/markdownStyles';
import type { Components } from 'react-markdown';

interface MarkdownContentProps {
  content: string;
  variant?: 'default' | 'light';
  sx?: SxProps<Theme>;
}

export function MarkdownContent({ content, variant = 'default', sx }: MarkdownContentProps) {
  const styles = variant === 'light' ? markdownStylesLight : markdownStyles;
  
  // MUI's sx prop accepts arrays, but TypeScript types are strict
  // Use type assertion to allow array merging
  const mergedSx = sx ? [styles, sx] as SxProps<Theme> : styles;
  
  // Custom components to wrap tables in scrollable container
  const components: Partial<Components> = {
    table: ({ children, ...props }) => (
      <Box
        sx={{
          overflowX: 'auto',
          overflowY: 'visible',
          width: '100%',
          mb: 1,
          // Add a subtle shadow to indicate scrollability
          '&::-webkit-scrollbar': {
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'rgba(0, 0, 0, 0.05)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '4px',
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.3)',
            },
          },
        }}
      >
        <table {...props}>{children}</table>
      </Box>
    ),
  };
  
  return (
    <Box sx={mergedSx}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </Box>
  );
}

