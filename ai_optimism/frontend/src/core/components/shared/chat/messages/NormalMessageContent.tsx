/**
 * Shared component for rendering normal message content with JSON blocks
 * Supports collapsible JSON display and Generate Controls button
 * Used by both researcher portal and client-side message bubbles
 */

import { Box, Button, CircularProgress } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { MarkdownContent } from './MarkdownContent';
import { JSONBlockCollapsible } from './JSONBlockCollapsible';
import { splitTextWithJSON } from './utils/jsonExtractors';

interface NormalMessageContentProps {
  content: string;
  variant?: 'default' | 'light';
  onGenerateControls?: (jsonData: any) => void;
  isGeneratingControls?: boolean;
  isStreaming?: boolean;
}

/**
 * Renders normal message content with support for:
 * - JSON block extraction and collapsible display
 * - Generate Controls button when JSON contains valid optimization components
 */
export function NormalMessageContent({
  content,
  variant = 'default',
  onGenerateControls,
  isGeneratingControls = false,
  isStreaming = false,
}: NormalMessageContentProps) {
  // Split content into parts with JSON blocks
  const contentParts = splitTextWithJSON(content);
  const hasJSON = contentParts.some(p => p.type === 'json');

  // Check if JSON contains valid components for controls generation
  let hasValidComponents = false;
  let parsedJSON: any = null;
  
  if (hasJSON) {
    // Try to parse JSON from the first JSON block
    const jsonPart = contentParts.find(p => p.type === 'json');
    if (jsonPart) {
      try {
        parsedJSON = JSON.parse(jsonPart.content);
        // Check if it has at least one valid component
        const hasVariables = parsedJSON.variables && Array.isArray(parsedJSON.variables) && parsedJSON.variables.length > 0;
        const hasObjectives = parsedJSON.objectives && Array.isArray(parsedJSON.objectives) && parsedJSON.objectives.length > 0;
        const hasConstraints = parsedJSON.constraints && Array.isArray(parsedJSON.constraints) && parsedJSON.constraints.length > 0;
        const hasProperties = parsedJSON.properties && Array.isArray(parsedJSON.properties) && parsedJSON.properties.length > 0;
        
        hasValidComponents = hasVariables || hasObjectives || hasConstraints || hasProperties;
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
  }

  // If no JSON blocks, render simple markdown with streaming indicator
  if (!hasJSON) {
    return (
      <Box>
        <MarkdownContent content={content} variant={variant} />
        {isStreaming && (
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              width: '2px',
              height: '1em',
              bgcolor: 'text.primary',
              ml: 0.5,
              animation: 'blink 1s infinite',
              '@keyframes blink': {
                '0%, 50%': { opacity: 1 },
                '51%, 100%': { opacity: 0 },
              },
            }}
          />
        )}
      </Box>
    );
  }

  // If JSON blocks exist, render with collapsible JSON sections
  return (
    <Box>
      {contentParts.map((part, index) => {
        if (part.type === 'json') {
          return (
            <JSONBlockCollapsible key={`json-${index}`} jsonContent={part.content} />
          );
        } else {
          return (
            <MarkdownContent
              key={`text-${index}`}
              content={part.content}
              variant={variant}
            />
          );
        }
      })}
      
      {/* Generate Controls button if JSON contains valid components */}
      {hasValidComponents && onGenerateControls && (
        <Box sx={{ mt: 2 }}>
          <Button
            fullWidth
            variant="contained"
            color="secondary"
            startIcon={isGeneratingControls ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isGeneratingControls && parsedJSON) {
                // Pass the parsed JSON object - callers can handle conversion as needed
                onGenerateControls(parsedJSON);
              }
            }}
            disabled={isGeneratingControls}
          >
            {isGeneratingControls ? 'Generating Controls...' : '✨ Generate Controls'}
          </Button>
        </Box>
      )}
    </Box>
  );
}

