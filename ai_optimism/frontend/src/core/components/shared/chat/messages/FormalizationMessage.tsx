/**
 * Shared formalization message component
 * Used by both client and researcher interfaces
 */

import { Box, Accordion, AccordionSummary, AccordionDetails, Chip, Typography, Button, CircularProgress, Alert } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { MarkdownContent } from './MarkdownContent';
import { JSONBlockCollapsible } from './JSONBlockCollapsible';

interface FormalizationMessageProps {
  content: string;
  isIncomplete?: boolean;
  isError?: boolean;
  errorDetails?: string;
  onGenerateControls?: (jsonData: any) => void; // Accepts JSON object directly (like NormalMessageContent)
  isGeneratingControls?: boolean;
  variant?: 'default' | 'light';
  structuredData?: unknown; // Complete JSON data from metadata
  validation?: {
    errors?: string[];
    warnings?: string[];
  };
}

export function FormalizationMessage({
  content,
  isIncomplete = false,
  isError = false,
  errorDetails,
  onGenerateControls,
  isGeneratingControls = false,
  variant = 'default',
  structuredData,
  validation,
}: FormalizationMessageProps) {
  // Create complete description with JSON for generation
  const getCompleteFormalizationText = (): string => {
    if (structuredData) {
      try {
        const jsonString = JSON.stringify(structuredData, null, 2);
        return `${content}\n\n\`\`\`json\n${jsonString}\n\`\`\``;
      } catch {
        return content;
      }
    }
    return content;
  };

  const hasValidationErrors = validation?.errors && validation.errors.length > 0;
  const hasValidationWarnings = validation?.warnings && validation.warnings.length > 0;
  const effectiveIncomplete = isIncomplete || hasValidationErrors || isError;

  return (
    <Box>
      <Accordion
        disableGutters
        elevation={0}
        sx={{
          bgcolor: 'transparent',
          '&:before': { display: 'none' },
          mt: 1,
          width: '100%',
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            px: 0,
            minHeight: 40,
            width: '100%',
            '& .MuiAccordionSummary-content': {
              my: 0.5,
              width: '100%',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', width: '100%' }}>
            <Chip
              label={
                isError 
                  ? '❌ Formalization Failed' 
                  : effectiveIncomplete 
                    ? '⚠️ Incomplete Formalization' 
                    : '✨ Problem Formalized'
              }
              size="small"
              color={isError ? 'error' : effectiveIncomplete ? 'warning' : 'success'}
            />
            <Typography variant="caption" color="text.secondary">
              Click to expand
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 0, pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Error state */}
            {isError && (
              <Alert severity="error" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 'bold' }}>
                  Formalization Error:
                </Typography>
                <Typography variant="body2">
                  {errorDetails || 'An error occurred while formalizing the problem. Please try again.'}
                </Typography>
              </Alert>
            )}

            {/* Validation errors */}
            {hasValidationErrors && (
              <Alert severity="error" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 'bold' }}>
                  Validation Errors:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {validation.errors!.map((error, idx) => (
                    <li key={idx}>
                      <Typography variant="body2">{error}</Typography>
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* Validation warnings */}
            {hasValidationWarnings && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 'bold' }}>
                  Warnings:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {validation.warnings!.map((warning, idx) => (
                    <li key={idx}>
                      <Typography variant="body2">{warning}</Typography>
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            <MarkdownContent content={content} variant={variant} />
            {structuredData && !effectiveIncomplete ? (
              <JSONBlockCollapsible jsonContent={JSON.stringify(structuredData, null, 2)} />
            ) : null}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Generate Controls button for complete formalization - client side only */}
      {!effectiveIncomplete && onGenerateControls && structuredData != null ? (
        <Box sx={{ mt: 2 }}>
          <Button
            fullWidth
            variant="contained"
            color="secondary"
            startIcon={isGeneratingControls ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isGeneratingControls && onGenerateControls && structuredData != null) {
                // Pass the structuredData JSON object directly (like normal message bubble)
                // This avoids API calls and is much faster
                onGenerateControls(structuredData);
              }
            }}
            disabled={isGeneratingControls}
          >
            {isGeneratingControls ? 'Generating Controls...' : '✨ Generate Controls Panel'}
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
            {isGeneratingControls ? 'Generating controls...' : 'Generate optimization controls from this problem definition'}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}

