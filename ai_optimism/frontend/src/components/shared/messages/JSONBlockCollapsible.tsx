/**
 * Shared collapsible JSON block component
 * Used by both client and researcher interfaces
 */

import { useState } from 'react';
import { Box, Accordion, AccordionSummary, AccordionDetails, Typography, Chip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CodeIcon from '@mui/icons-material/Code';

interface JSONBlockCollapsibleProps {
  jsonContent: string;
}

export function JSONBlockCollapsible({ jsonContent }: JSONBlockCollapsibleProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Try to format JSON nicely
  let formattedJSON = jsonContent;
  try {
    const parsed = JSON.parse(jsonContent);
    formattedJSON = JSON.stringify(parsed, null, 2);
  } catch (e) {
    // If not valid JSON, use as-is
  }
  
  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => setExpanded(isExpanded)}
      disableGutters
      elevation={0}
      sx={{
        my: 1,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'grey.50',
        '&:before': { display: 'none' },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          px: 1.5,
          py: 1,
          minHeight: 40,
          '& .MuiAccordionSummary-content': {
            my: 0,
            alignItems: 'center',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <CodeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {expanded ? 'Hide structured data' : 'Show structured data (JSON)'}
          </Typography>
          {!expanded && (
            <Chip
              label="JSON"
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: 'primary.light',
                color: 'primary.contrastText',
              }}
            />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.5, pb: 1.5, pt: 0 }}>
        <Box
          component="pre"
          sx={{
            bgcolor: 'grey.100',
            p: 1.5,
            borderRadius: 1,
            overflow: 'auto',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            m: 0,
            maxHeight: '400px',
            border: 1,
            borderColor: 'divider',
          }}
        >
          {formattedJSON}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

