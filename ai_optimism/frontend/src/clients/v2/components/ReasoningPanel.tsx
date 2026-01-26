import { useEffect, useMemo, useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  Chip,
  Divider,
  TextField,
  Alert,
} from '@mui/material';
import type { AnalysisBlock, AnalysisChecklistItem } from '@/core/utils/analysisParser';

interface ReasoningPanelProps {
  analysis: AnalysisBlock | null;
  onSave: (analysis: AnalysisBlock) => void;
}

const emptyAnalysis: AnalysisBlock = {
  reasoning: '',
  assumptions: [],
  checklist: {
    variables: [],
    objectives: [],
    constraints: [],
    properties: [],
    data: [],
  },
};

const statusColor = (status: string) => {
  if (status === 'complete') return 'success';
  if (status === 'partial') return 'warning';
  return 'default';
};

export function ReasoningPanel({ analysis, onSave }: ReasoningPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const safeAnalysis = useMemo(() => analysis || emptyAnalysis, [analysis]);

  useEffect(() => {
    if (isEditing) return;
    setDraftText(JSON.stringify(safeAnalysis, null, 2));
    setError(null);
  }, [safeAnalysis, isEditing]);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(draftText);
      onSave(parsed as AnalysisBlock);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError('Invalid JSON. Fix errors before saving.');
    }
  };

  const renderChecklist = (title: string, items?: AnalysisChecklistItem[]) => (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      {items && items.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {items.map((item, idx) => (
            <Box
              key={`${title}-${idx}`}
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Chip
                size="small"
                label={item.status}
                color={statusColor(item.status) as any}
                variant="outlined"
              />
              <Typography variant="body2">{item.label}</Typography>
              {item.assumed && (
                <Chip size="small" label="assumed" variant="outlined" />
              )}
            </Box>
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No items yet.
        </Typography>
      )}
    </Box>
  );

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6" fontWeight="bold">
          Reasoning & Checklist
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
            minRows={10}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="Edit analysis JSON..."
            sx={{ flex: 1, fontFamily: 'monospace' }}
          />
          <Typography variant="caption" color="text.secondary">
            Edit the analysis JSON to update reasoning, assumptions, and checklist.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <Typography variant="subtitle2">Reasoning</Typography>
          <Typography variant="body2" sx={{ mb: 2 }} color="text.secondary">
            {safeAnalysis.reasoning || 'No reasoning captured yet.'}
          </Typography>

          <Divider sx={{ mb: 2 }} />

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Assumptions
          </Typography>
          {safeAnalysis.assumptions && safeAnalysis.assumptions.length > 0 ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {safeAnalysis.assumptions.map((assumption, idx) => (
                <Chip
                  key={`assumption-${idx}`}
                  label={assumption.text}
                  variant={assumption.assumed ? 'outlined' : 'filled'}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No assumptions recorded.
            </Typography>
          )}

          <Divider sx={{ mb: 2 }} />

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Checklist
          </Typography>
          {renderChecklist('Variables', safeAnalysis.checklist?.variables)}
          {renderChecklist('Objectives', safeAnalysis.checklist?.objectives)}
          {renderChecklist('Constraints', safeAnalysis.checklist?.constraints)}
          {renderChecklist('Properties', safeAnalysis.checklist?.properties)}
          {renderChecklist('Data', safeAnalysis.checklist?.data)}
        </Box>
      )}
    </Paper>
  );
}
