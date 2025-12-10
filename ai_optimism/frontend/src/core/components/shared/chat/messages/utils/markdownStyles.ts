/**
 * Shared markdown styling for message bubbles
 * Used by both client and researcher chat interfaces
 */

import { SxProps, Theme } from '@mui/material';

/**
 * Standard markdown styles for message content
 * Smaller font size for compact display
 */
export const markdownStyles: SxProps<Theme> = {
  fontSize: '0.875rem', // Smaller font size
  '& p': {
    margin: 0,
    mb: 1,
    fontSize: 'inherit',
    '&:last-child': { mb: 0 },
  },
  '& ul, & ol': {
    pl: 2,
    mb: 1,
    fontSize: 'inherit',
  },
  '& li': {
    mb: 0.5,
  },
  '& code': {
    bgcolor: 'rgba(0, 0, 0, 0.06)',
    px: 0.5,
    py: 0.25,
    borderRadius: 0.5,
    fontFamily: 'monospace',
    fontSize: '0.85em',
  },
  '& pre': {
    bgcolor: 'rgba(0, 0, 0, 0.06)',
    p: 1,
    borderRadius: 1,
    overflow: 'auto',
    mb: 1,
    fontSize: 'inherit',
  },
  '& pre code': {
    bgcolor: 'transparent',
    p: 0,
  },
  '& h1, & h2, & h3, & h4, & h5, & h6': {
    mt: 2,
    mb: 1,
    fontWeight: 'bold',
    fontSize: 'inherit',
  },
  '& blockquote': {
    borderLeft: '3px solid',
    borderColor: 'divider',
    pl: 1,
    ml: 0,
    fontStyle: 'italic',
    color: 'text.secondary',
    fontSize: 'inherit',
  },
  '& table': {
    borderCollapse: 'collapse',
    width: '100%',
    minWidth: '100%', // Ensure table takes full width of container
    fontSize: 'inherit',
    // Margin handled by wrapper in MarkdownContent
  },
  '& th, & td': {
    border: '1px solid',
    borderColor: 'divider',
    px: 1,
    py: 0.5,
    fontSize: 'inherit',
  },
  '& th': {
    bgcolor: 'grey.100',
    fontWeight: 'bold',
  },
};

/**
 * Alternative markdown styles with lighter background for code blocks
 * Used in client chat interface
 */
export const markdownStylesLight: SxProps<Theme> = {
  ...markdownStyles,
  '& code': {
    bgcolor: 'grey.200',
    px: 0.5,
    py: 0.25,
    borderRadius: 0.5,
    fontFamily: 'monospace',
    fontSize: '0.875em',
  },
  '& pre': {
    bgcolor: 'grey.200',
    p: 1,
    borderRadius: 1,
    overflow: 'auto',
    mb: 1,
  },
  '& blockquote': {
    borderLeft: '4px solid',
    borderColor: 'primary.main',
    pl: 2,
    my: 1,
    color: 'text.secondary',
  },
};

