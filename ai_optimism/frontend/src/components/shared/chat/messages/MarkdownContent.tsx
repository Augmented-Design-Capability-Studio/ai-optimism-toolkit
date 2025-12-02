/**
 * Shared markdown content renderer
 * Wraps ReactMarkdown with consistent styling
 */

import { Box, SxProps, Theme } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownStyles, markdownStylesLight } from './utils/markdownStyles';

interface MarkdownContentProps {
  content: string;
  variant?: 'default' | 'light';
  sx?: SxProps<Theme>;
}

export function MarkdownContent({ content, variant = 'default', sx }: MarkdownContentProps) {
  const styles = variant === 'light' ? markdownStylesLight : markdownStyles;
  
  // Merge styles properly for TypeScript
  const mergedSx: SxProps<Theme> = sx ? [styles, sx] : styles;
  
  return (
    <Box sx={mergedSx}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </Box>
  );
}

