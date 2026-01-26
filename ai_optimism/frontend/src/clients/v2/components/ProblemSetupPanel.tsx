import { useEffect, useMemo, useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  TextField,
  Alert,
  Divider,
} from '@mui/material';
import type { Controls } from '@/core/components/controls/types';

interface ProblemSetupPanelProps {
  controls: Controls | null;
  onApplyComponent: (
    component: 'variables' | 'objectives' | 'constraints' | 'properties',
    data: Array<Record<string, unknown>>
  ) => void;
}

const sectionOrder: Array<{
  key: 'variables' | 'objectives' | 'constraints' | 'properties';
  title: string;
}> = [
  { key: 'variables', title: '1. Variables' },
  { key: 'objectives', title: '2. Objectives' },
  { key: 'constraints', title: '3. Constraints' },
  { key: 'properties', title: '4. Properties' },
];

export function ProblemSetupPanel({ controls, onApplyComponent }: ProblemSetupPanelProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const currentData = useMemo(() => ({
    variables: controls?.variables || [],
    objectives: controls?.objectives || [],
    constraints: controls?.constraints || [],
    properties: controls?.properties || [],
  }), [controls]);

  useEffect(() => {
    if (!editingSection) return;
    const data = (currentData as any)[editingSection] || [];
    setDraftText(JSON.stringify(data, null, 2));
    setError(null);
  }, [editingSection, currentData]);

  const handleApply = () => {
    if (!editingSection) return;
    try {
      const parsed = JSON.parse(draftText);
      if (!Array.isArray(parsed)) {
        setError('Section data must be a JSON array.');
        return;
      }
      onApplyComponent(editingSection as any, parsed);
      setEditingSection(null);
      setError(null);
    } catch (err) {
      setError('Invalid JSON. Fix errors before saving.');
    }
  };

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6" fontWeight="bold">
          Problem Setup
        </Typography>
        {editingSection ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" onClick={() => setEditingSection(null)}>
              Cancel
            </Button>
            <Button size="small" variant="contained" onClick={handleApply}>
              Confirm
            </Button>
          </Box>
        ) : null}
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {sectionOrder.map((section, idx) => {
          const data = (currentData as any)[section.key] || [];
          const isEditing = editingSection === section.key;

          return (
            <Box key={section.key} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {section.title}
                </Typography>
                {!editingSection ? (
                  <Button size="small" variant="outlined" onClick={() => setEditingSection(section.key)}>
                    Edit
                  </Button>
                ) : null}
              </Box>

              {isEditing ? (
                <Box sx={{ mt: 1 }}>
                  {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
                  <TextField
                    fullWidth
                    multiline
                    minRows={6}
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    sx={{ fontFamily: 'monospace' }}
                  />
                </Box>
              ) : (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {data.length ? `${data.length} item(s)` : 'No data yet.'}
                  </Typography>
                  {data.length > 0 && (
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      value={JSON.stringify(data, null, 2)}
                      InputProps={{ readOnly: true }}
                      sx={{ mt: 1, fontFamily: 'monospace' }}
                    />
                  )}
                </Box>
              )}

              {idx < sectionOrder.length - 1 && <Divider sx={{ mt: 2 }} />}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
