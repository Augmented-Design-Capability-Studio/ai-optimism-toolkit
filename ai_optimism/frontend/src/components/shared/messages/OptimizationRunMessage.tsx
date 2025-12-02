/**
 * Shared optimization run message component
 * Used by both client and researcher interfaces
 */

import { Box, Accordion, AccordionSummary, AccordionDetails, Chip, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { MarkdownContent } from './MarkdownContent';

interface OptimizationRunMessageProps {
  content: string;
  status?: 'completed' | 'failed' | 'running';
  bestScore?: number;
  runId?: string;
  optimizationPacket?: any;
  heuristicMap?: any;
  variant?: 'default' | 'light';
  useMarkdown?: boolean; // Client uses plain text, researcher uses markdown
}

export function OptimizationRunMessage({
  content,
  status,
  bestScore,
  runId,
  optimizationPacket,
  heuristicMap,
  variant = 'default',
  useMarkdown = true,
}: OptimizationRunMessageProps) {
  const statusLabel =
    status === 'completed'
      ? '✅ Optimization Completed'
      : status === 'failed'
      ? '❌ Optimization Failed'
      : '⏳ Optimization Running';

  const statusColor =
    status === 'completed' ? 'success' : status === 'failed' ? 'error' : 'default';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
      {/* Optimization Report Accordion */}
      <Accordion
        disableGutters
        elevation={0}
        sx={{
          bgcolor: 'transparent',
          '&:before': { display: 'none' },
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
            <Chip label={statusLabel} size="small" color={statusColor} />
            {bestScore !== undefined && (
              <Chip label={`Best Score: ${bestScore.toFixed(3)}`} size="small" />
            )}
            <Typography variant="caption" color="text.secondary">
              Click to expand report
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 0, pt: 1 }}>
          {useMarkdown ? (
            <MarkdownContent content={content} variant={variant} />
          ) : (
            <Typography
              variant="body2"
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {content}
            </Typography>
          )}
          {runId && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Run ID: {runId}
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Optimization Packet Accordion */}
      {optimizationPacket && (
        <Accordion
          disableGutters
          elevation={0}
          sx={{
            bgcolor: 'transparent',
            '&:before': { display: 'none' },
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
              <Chip label="📦 Optimization Packet" size="small" color="info" />
              <Typography variant="caption" color="text.secondary">
                Click to expand packet sent to server
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0, pt: 1 }}>
            <Box sx={{ bgcolor: 'grey.50', p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 'bold' }}>
                Full optimization packet sent to backend:
              </Typography>
              <Box
                component="pre"
                sx={{
                  margin: 0,
                  fontSize: '0.75rem',
                  overflow: 'auto',
                  maxHeight: '400px',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {JSON.stringify(optimizationPacket, null, 2)}
              </Box>
              {heuristicMap != null && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 'bold' }}>
                    Heuristic Map:
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      margin: 0,
                      fontSize: '0.75rem',
                      overflow: 'auto',
                      maxHeight: '300px',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {JSON.stringify(heuristicMap, null, 2)}
                  </Box>
                </Box>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
}

