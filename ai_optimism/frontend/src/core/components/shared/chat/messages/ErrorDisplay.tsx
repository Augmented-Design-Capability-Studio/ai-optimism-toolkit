/**
 * Error display component with accordion for detailed error information
 * Used to show control generation errors and other API errors
 */

import { useState } from 'react';
import { 
  Box, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails, 
  Typography, 
  Chip,
  Alert,
  AlertTitle,
  IconButton,
  Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ErrorIcon from '@mui/icons-material/Error';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface ErrorDisplayProps {
  error: string;
  details?: string;
  title?: string;
  variant?: 'error' | 'warning';
}

export function ErrorDisplay({ 
  error, 
  details, 
  title = 'Error Details',
  variant = 'error'
}: ErrorDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const errorText = details 
      ? `${error}\n\nDetails:\n${details}`
      : error;
    
    try {
      await navigator.clipboard.writeText(errorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error:', err);
    }
  };

  const fullErrorText = details ? `${error}\n\n${details}` : error;

  return (
    <Alert 
      severity={variant}
      sx={{
        mt: 1,
        '& .MuiAlert-icon': {
          alignItems: 'center',
        },
      }}
      icon={<ErrorIcon />}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: details ? 1 : 0 }}>
            {error}
            {details && (
              <Tooltip title={copied ? 'Copied!' : 'Copy error details'}>
                <IconButton
                  size="small"
                  onClick={handleCopy}
                  sx={{ 
                    ml: 'auto',
                    p: 0.5,
                    color: 'inherit',
                    opacity: 0.7,
                    '&:hover': { opacity: 1 }
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </AlertTitle>
          
          {details && (
            <Accordion
              disableGutters
              elevation={0}
              sx={{
                bgcolor: 'transparent',
                boxShadow: 'none',
                mt: 1,
                '&:before': { display: 'none' },
                '&.Mui-expanded': {
                  mt: 1,
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: 'inherit' }} />}
                sx={{
                  px: 0,
                  py: 0.5,
                  minHeight: 32,
                  '& .MuiAccordionSummary-content': {
                    my: 0,
                  },
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                  {title}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0, pt: 1, pb: 0 }}>
                <Box
                  component="pre"
                  sx={{
                    bgcolor: 'rgba(0, 0, 0, 0.05)',
                    p: 1.5,
                    borderRadius: 1,
                    overflow: 'auto',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    m: 0,
                    maxHeight: '300px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {details}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      </Box>
    </Alert>
  );
}

