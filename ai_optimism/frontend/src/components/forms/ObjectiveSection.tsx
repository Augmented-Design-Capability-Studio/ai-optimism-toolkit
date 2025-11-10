import React from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    CircularProgress,
    Alert,
    Tooltip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import { AutoAwesome as AutoAwesomeIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

interface ObjectiveSectionProps {
    objectiveDescription: string;
    objectiveCode: string;
    objectiveExplanation: string;
    showCode: boolean;
    isGenerating: boolean;
    isConnected: boolean;
    error?: string | null;
    onDescriptionChange: (value: string) => void;
    onCodeChange: (value: string) => void;
    onShowCodeChange: (show: boolean) => void;
    onGenerate: () => void;
}

export const ObjectiveSection: React.FC<ObjectiveSectionProps> = ({
    objectiveDescription,
    objectiveCode,
    objectiveExplanation,
    showCode,
    isGenerating,
    isConnected,
    error,
    onDescriptionChange,
    onCodeChange,
    onShowCodeChange,
    onGenerate
}) => {
    return (
        <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Objective Function</Typography>
                <Tooltip title={!isConnected ? "Connect to AI first" : !objectiveDescription.trim() ? "Enter description first" : "Generate objective code from description"}>
                    <span>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={onGenerate}
                            disabled={!isConnected || isGenerating || !objectiveDescription.trim()}
                            startIcon={isGenerating ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                        >
                            {isGenerating ? 'Generating...' : 'Generate Objective'}
                        </Button>
                    </span>
                </Tooltip>
            </Box>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            )}
            <TextField
                fullWidth
                label="Objective Description"
                value={objectiveDescription}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="e.g., Maximize profit (revenue - cost) while keeping production_time under 8 hours"
                multiline
                rows={2}
                required
                sx={{ mb: 2 }}
                helperText="Describe your optimization goal. Mention specific variables and properties by name to help the AI generate accurate code."
            />
            <Accordion expanded={showCode} onChange={() => onShowCodeChange(!showCode)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2">
                        {objectiveCode ? 'View Generated Code' : 'Generated code will appear here'}
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {objectiveCode && (
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                value={objectiveExplanation}
                                placeholder="AI-generated explanation will appear here..."
                                label="Code Explanation"
                                InputProps={{
                                    readOnly: true,
                                }}
                                sx={{ 
                                    '& .MuiInputBase-input': {
                                        backgroundColor: '#f5f5f5',
                                    }
                                }}
                            />
                        )}
                        <TextField
                            fullWidth
                            multiline
                            rows={6}
                            value={objectiveCode}
                            onChange={(e) => onCodeChange(e.target.value)}
                            placeholder="# Generated Python code will appear here"
                            sx={{
                                fontFamily: 'monospace',
                                '& .MuiInputBase-input': {
                                    fontFamily: 'monospace',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                }
                            }}
                        />
                    </Box>
                </AccordionDetails>
            </Accordion>
        </Box>
    );
};
