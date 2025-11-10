import React from 'react';
import { Box, TextField, Typography, Alert, Button, Card, CardContent } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface ProblemBasicInfoProps {
    name: string;
    description: string;
    onNameChange: (name: string) => void;
    onDescriptionChange: (description: string) => void;
    onNext: () => void;
    onBack?: (() => void) | null;
    error?: string | null;
}

export const ProblemBasicInfo: React.FC<ProblemBasicInfoProps> = ({
    name,
    description,
    onNameChange,
    onDescriptionChange,
    onNext,
    onBack,
    error
}) => {
    return (
        <Card>
            <CardContent>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>Problem Information</Typography>
                    <TextField
                        fullWidth
                        label="Problem Name"
                        value={name}
                        onChange={(e) => onNameChange(e.target.value)}
                        required
                        sx={{ mb: 2 }}
                    />

                    {error && (
                        <Alert severity={error.includes('coming soon') ? 'info' : 'error'} sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <TextField
                        fullWidth
                        label="Description"
                        value={description}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                        placeholder="e.g., Optimize cookie production to maximize profit while meeting customer demand"
                        multiline
                        rows={2}
                        helperText="Describe your optimization problem. Mention key variables you'll need (e.g., quantity, price, time) to help AI generate relevant suggestions."
                    />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                    {onBack ? (
                        <Button 
                            variant="outlined" 
                            onClick={onBack}
                            startIcon={<ArrowBackIcon />}
                        >
                            Back
                        </Button>
                    ) : <Box />}
                    <Button 
                        variant="contained" 
                        onClick={onNext}
                        disabled={!name.trim()}
                    >
                        Next
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
};
