'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Alert,
} from '@mui/material';
import { useBackend } from '../contexts/BackendContext';

interface BackendSettingsProps {
    open: boolean;
    onClose: () => void;
}

export const BackendSettings: React.FC<BackendSettingsProps> = ({ open, onClose }) => {
    const { state, setBackendUrl } = useBackend();
    const [url, setUrl] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Load current URL when dialog opens
    useEffect(() => {
        if (open) {
            setUrl(state.backendUrl);
            setError(null);
        }
    }, [open, state.backendUrl]);

    const handleSave = () => {
        if (!url.trim()) {
            setError('Backend URL is required');
            return;
        }

        try {
            new URL(url); // Validate URL format
            setBackendUrl(url.trim());
            setError(null);
            onClose();
        } catch {
            setError('Invalid URL format');
        }
    };

    const handleReset = () => {
        setUrl('http://localhost:8000');
        setError(null);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Backend Settings</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Backend URL"
                    type="url"
                    fullWidth
                    variant="outlined"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    helperText="URL of the backend server (e.g., http://localhost:8000 or ngrok URL)"
                    error={!!error}
                />
                {error && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                        {error}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleReset} color="secondary">
                    Reset to Default
                </Button>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} variant="contained">
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};