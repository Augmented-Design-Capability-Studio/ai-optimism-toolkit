/**
 * Dialog for editing session's master system prompt
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { CHAT_SYSTEM_PROMPT } from '@/clients/prompts';

interface SystemPromptDialogProps {
  open: boolean;
  sessionId: string;
  currentSystemPrompt?: string | null;
  onClose: () => void;
  onSave: (sessionId: string, systemPrompt: string) => Promise<void>;
}

export function SystemPromptDialog({
  open,
  sessionId,
  currentSystemPrompt,
  onClose,
  onSave,
}: SystemPromptDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize prompt when dialog opens or currentSystemPrompt changes
  useEffect(() => {
    if (open) {
      // Use current system prompt if available, otherwise use default from core
      setPrompt(currentSystemPrompt || CHAT_SYSTEM_PROMPT);
      setError(null);
    }
  }, [open, currentSystemPrompt]);

  const handleSave = async () => {
    if (!prompt.trim()) {
      setError('System prompt cannot be empty');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(sessionId, prompt.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save system prompt');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPrompt(CHAT_SYSTEM_PROMPT);
    setError(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Master Prompt</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            This prompt is used as the system instruction for AI responses in this session.
            You can add session-specific context (e.g., pretending to pull data from a database for testing).
            The default prompt from core is shown below - you can modify it or add additional context.
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Default prompt (from core):
          </Typography>
          <Box
            sx={{
              p: 1,
              bgcolor: 'grey.100',
              borderRadius: 1,
              mb: 2,
              maxHeight: 150,
              overflow: 'auto',
              fontSize: '0.75rem',
              fontFamily: 'monospace',
            }}
          >
            {CHAT_SYSTEM_PROMPT}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          multiline
          rows={12}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter system prompt..."
          variant="outlined"
          sx={{
            '& .MuiInputBase-root': {
              fontFamily: 'monospace',
              fontSize: '0.875rem',
            },
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleReset} disabled={isSaving}>
          Reset to Default
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

