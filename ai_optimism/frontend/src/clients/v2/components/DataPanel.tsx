import { useEffect, useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  TextField,
  Alert,
  Divider,
} from '@mui/material';
import type { DataPayload } from '@/core/utils/dataParser';

interface DataPanelProps {
  dataPayload: DataPayload | null;
  onSave: (data: DataPayload) => void;
}

export function DataPanel({ dataPayload, onSave }: DataPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) return;
    if (dataPayload) {
      setDraftText(JSON.stringify(dataPayload, null, 2));
    } else {
      setDraftText(JSON.stringify({ name: 'dataset', rows: [] }, null, 2));
    }
    setError(null);
  }, [dataPayload, isEditing]);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(draftText);
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.rows)) {
        setError('Data payload must include "name" and a "rows" array.');
        return;
      }
      onSave(parsed as DataPayload);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError('Invalid JSON. Fix errors before saving.');
    }
  };

  return (
    <Paper sx={{ display: 'flex', flexDirection: 'column', p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6" fontWeight="bold">
          Data
        </Typography>
        {!isEditing ? (
          <Button size="small" variant="outlined" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button size="small" variant="contained" onClick={handleSave}>
              Confirm
            </Button>
          </Box>
        )}
      </Box>

      {isEditing ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            fullWidth
            multiline
            minRows={6}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            sx={{ fontFamily: 'monospace', flex: 1 }}
          />
        </Box>
      ) : (
        <Box sx={{ flex: 1 }}>
          {dataPayload ? (
            <>
              <Typography variant="subtitle2">{dataPayload.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {dataPayload.rows.length} row(s)
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <TextField
                fullWidth
                multiline
                minRows={4}
                value={JSON.stringify(dataPayload.rows.slice(0, 5), null, 2)}
                InputProps={{ readOnly: true }}
                sx={{ fontFamily: 'monospace' }}
              />
              {dataPayload.rows.length > 5 && (
                <Typography variant="caption" color="text.secondary">
                  Showing first 5 rows only.
                </Typography>
              )}
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No data provided yet.
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
}
