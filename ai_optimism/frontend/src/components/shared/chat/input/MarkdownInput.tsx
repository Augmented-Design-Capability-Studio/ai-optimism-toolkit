/**
 * Shared markdown input component with optional preview
 * Used by both client and researcher chat interfaces
 */

import { useState, useRef } from 'react';
import { Box, IconButton, Tooltip, TextField, Checkbox, FormControlLabel, Paper, Popper } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { MarkdownContent } from '../messages/MarkdownContent';

interface MarkdownInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  // Optional AI button props
  showAIButton?: boolean;
  onRequestAI?: () => void;
  isGeneratingAI?: boolean;
  aiButtonDisabled?: boolean;
  aiButtonTooltip?: string;
}

export function MarkdownInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Type your message...',
  disabled = false,
  isLoading = false,
  showAIButton = false,
  onRequestAI,
  isGeneratingAI = false,
  aiButtonDisabled = false,
  aiButtonTooltip,
}: MarkdownInputProps) {
  const [showPreview, setShowPreview] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled || isLoading) return;
    onSubmit(e);
  };

  const handlePreviewChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowPreview(event.target.checked);
  };

  return (
    <Box
      component="form"
      ref={containerRef}
      onSubmit={handleSubmit}
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        position: 'relative',
      }}
    >
      <Box
        sx={{
          p: 1.5,
          display: 'flex',
          gap: 1,
          alignItems: 'flex-end',
          position: 'relative',
        }}
      >
        <Box sx={{ flex: 1 }}>
          <TextField
            multiline
            maxRows={6}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            fullWidth
            size="small"
            sx={{
              '& .MuiInputBase-root': {
                fontSize: '0.875rem',
              },
            }}
          />
        </Box>
        {/* Preview checkbox outside input box, next to action buttons */}
        <FormControlLabel
          control={
            <Checkbox
              checked={showPreview}
              onChange={handlePreviewChange}
              size="small"
              disabled={disabled || isLoading}
              sx={{
                padding: '2px',
                '& .MuiSvgIcon-root': {
                  fontSize: '1rem',
                },
              }}
            />
          }
          label="Preview"
          sx={{
            m: 0,
            alignSelf: 'flex-end',
            '& .MuiFormControlLabel-label': {
              fontSize: '0.75rem',
              ml: 0.5,
            },
          }}
        />
        {showAIButton && onRequestAI && (
          <Tooltip 
            title={aiButtonTooltip || (isGeneratingAI ? 'Generating...' : 'Draft AI response')}
            arrow
          >
            <span>
              <IconButton
                color="secondary"
                onClick={onRequestAI}
                disabled={aiButtonDisabled || isGeneratingAI}
                sx={{
                  opacity: isGeneratingAI ? 0.6 : 1,
                }}
              >
                <AutoAwesomeIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
        <IconButton 
          type="submit" 
          color="primary" 
          disabled={!value.trim() || disabled || isLoading}
        >
          <SendIcon />
        </IconButton>
      </Box>

      {/* Floating preview */}
      {showPreview && value.trim() && containerRef.current && (
        <Popper
          open={true}
          anchorEl={containerRef.current}
          placement="top"
          sx={{
            zIndex: 1300,
            mb: 1,
          }}
          modifiers={[
            {
              name: 'offset',
              options: {
                offset: [0, 8],
              },
            },
          ]}
        >
          <Paper
            elevation={4}
            sx={{
              p: 1.5,
              maxWidth: '600px',
              width: containerRef.current?.offsetWidth || 'auto',
              maxHeight: '300px',
              overflow: 'auto',
              fontSize: '0.8rem',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <MarkdownContent content={value} variant="light" />
          </Paper>
        </Popper>
      )}
    </Box>
  );
}
