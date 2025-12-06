/**
 * Shared formalization message component
 * Used by both client and researcher interfaces
 */

import { Box, Accordion, AccordionSummary, AccordionDetails, Chip, Typography, Button, CircularProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { MarkdownContent } from './MarkdownContent';
import { JSONBlockCollapsible } from './JSONBlockCollapsible';

interface FormalizationMessageProps {
  content: string;
  isIncomplete?: boolean;
  onGenerateControls?: (formalizationText: string) => void;
  isGeneratingControls?: boolean;
  variant?: 'default' | 'light';
  structuredData?: unknown; // Complete JSON data from metadata
}

export function FormalizationMessage({
  content,
  isIncomplete = false,
  onGenerateControls,
  isGeneratingControls = false,
  variant = 'default',
  structuredData,
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
              label={isIncomplete ? '⚠️ Incomplete Formalization' : '✨ Problem Formalized'}
              size="small"
              color={isIncomplete ? 'warning' : 'success'}
            />
            <Typography variant="caption" color="text.secondary">
              Click to expand
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 0, pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <MarkdownContent content={content} variant={variant} />
            {structuredData && !isIncomplete ? (
              <JSONBlockCollapsible jsonContent={JSON.stringify(structuredData, null, 2)} />
            ) : null}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Generate Controls button for complete formalization - client side only */}
      {!isIncomplete && onGenerateControls && (
        <Box sx={{ mt: 2 }}>
          <Button
            fullWidth
            variant="contained"
            color="secondary"
            startIcon={isGeneratingControls ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isGeneratingControls && onGenerateControls) {
                onGenerateControls(getCompleteFormalizationText());
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
      )}
    </Box>
  );
}

