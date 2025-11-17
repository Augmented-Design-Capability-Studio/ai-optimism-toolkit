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
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';

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
                rows={4}
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
                        {objectiveCode && objectiveExplanation && (
                            <Box sx={{ 
                                p: 2, 
                                backgroundColor: '#f5f5f5', 
                                borderRadius: 1,
                                border: '1px solid #e0e0e0'
                            }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                                    Code Explanation:
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
                                    {objectiveExplanation}
                                </Typography>
                            </Box>
                        )}
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                Generated Python Code (Editable)
                            </Typography>
                            <Box sx={{ 
                                border: '1px solid #e0e0e0', 
                                borderRadius: 1,
                                overflow: 'auto',
                                '& .prism-code': {
                                    fontFamily: 'monospace',
                                    fontSize: '0.875rem',
                                }
                            }}>
                                <Editor
                                    value={objectiveCode}
                                    onValueChange={onCodeChange}
                                    highlight={code => Prism.highlight(code, Prism.languages.python, 'python')}
                                    padding={12}
                                    placeholder="# Generated Python code will appear here"
                                    style={{
                                        fontFamily: 'monospace',
                                        fontSize: '0.875rem',
                                        minHeight: '200px',
                                        backgroundColor: '#1e1e1e',
                                        color: '#d4d4d4',
                                    }}
                                />
                            </Box>
                        </Box>
                    </Box>
                </AccordionDetails>
            </Accordion>
        </Box>
    );
};
