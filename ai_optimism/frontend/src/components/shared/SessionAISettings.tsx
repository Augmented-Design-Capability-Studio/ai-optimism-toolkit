'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    InputAdornment,
    Alert,
    CircularProgress,
    IconButton,
} from '@mui/material';
import {
    Send as SendIcon,
    Visibility,
    VisibilityOff,
    Close as CloseIcon,
} from '@mui/icons-material';
import { getAIConfig, setAIConfig, deleteAIConfig, type AISessionConfigStatus } from '../../services/sessionAIConfig';
import type { AIProvider } from '../../services/ai';

interface SessionAISettingsProps {
    open: boolean;
    sessionId: string;
    onClose: () => void;
    onConfigChange?: () => void;
}

// Static provider configuration
const staticProviders = {
    google: {
        name: 'Google (Gemini)',
        models: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    },
    openai: {
        name: 'OpenAI',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    },
    anthropic: {
        name: 'Anthropic (Claude)',
        models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
    },
};

export const SessionAISettings: React.FC<SessionAISettingsProps> = ({ 
    open, 
    sessionId, 
    onClose,
    onConfigChange,
}) => {
    const [config, setConfig] = useState<AISessionConfigStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [pushing, setPushing] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    
    // Form state
    const [provider, setProvider] = useState<AIProvider>('google');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('gemini-2.5-flash');
    const [showApiKey, setShowApiKey] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Load config when dialog opens
    useEffect(() => {
        if (open && sessionId) {
            loadConfig();
        }
    }, [open, sessionId]);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const sessionConfig = await getAIConfig(sessionId);
            setConfig(sessionConfig);
            if (sessionConfig) {
                setProvider(sessionConfig.provider as AIProvider);
                setModel(sessionConfig.model);
            }
        } catch (error: any) {
            if (error.response?.status !== 404) {
                console.error('[SessionAISettings] Failed to load config:', error);
            }
            setConfig(null);
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!config || disconnecting) {
            return;
        }

        setDisconnecting(true);
        setError(null);
        setSuccess(false);

        try {
            await deleteAIConfig(sessionId);
            setConfig(null);
            setApiKey('');
            setSuccess(true);
            if (onConfigChange) {
                onConfigChange();
            }
        } catch (error: any) {
            const errorMessage = error.message || 'Failed to disconnect AI provider';
            setError(errorMessage);
            console.error('[SessionAISettings] Failed to disconnect AI config:', error);
        } finally {
            setDisconnecting(false);
        }
    };

    const handlePushApiKey = async () => {
        if (!apiKey || !model) {
            setError('API key and model are required');
            return;
        }

        setError(null);
        setSuccess(false);
        setPushing(true);

        try {
            const result = await setAIConfig(sessionId, {
                provider,
                apiKey,
                model,
                setBy: 'researcher',
            });
            
            console.log('[SessionAISettings] API key pushed successfully:', result);
            setSuccess(true);
            
            // Verify the push succeeded
            let verified = false;
            for (let attempt = 0; attempt < 5; attempt++) {
                await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
                try {
                    await loadConfig();
                    const verifyConfig = await getAIConfig(sessionId);
                    if (verifyConfig && verifyConfig.status === 'connected') {
                        verified = true;
                        break;
                    }
                } catch (verifyError) {
                    console.log('[SessionAISettings] Verification attempt', attempt + 1, 'failed:', verifyError);
                }
            }
            
            if (!verified) {
                console.warn('[SessionAISettings] Could not verify API key was saved after push');
            }
            
            if (onConfigChange) {
                onConfigChange();
            }
            
            // Clear form after success
            setTimeout(() => {
                setSuccess(false);
                setApiKey('');
                onClose();
            }, 1500);
        } catch (error: any) {
            const errorMessage = error.message || error.response?.data?.detail || 'Failed to push API key to session';
            setError(errorMessage);
            console.error('[SessionAISettings] Failed to push API key:', error);
        } finally {
            setPushing(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Push API Key to Session</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    <Alert severity="info">
                        Push your API key to this session so the client can connect to the AI service.
                    </Alert>

                    <FormControl fullWidth>
                        <InputLabel>Provider</InputLabel>
                        <Select
                            value={provider}
                            label="Provider"
                            onChange={(e) => {
                                const newProvider = e.target.value as AIProvider;
                                setProvider(newProvider);
                                const providerInfo = staticProviders[newProvider as keyof typeof staticProviders];
                                if (providerInfo?.models.length > 0) {
                                    setModel(providerInfo.models[0]);
                                }
                            }}
                        >
                            <MenuItem value="google">Google Gemini</MenuItem>
                            <MenuItem value="openai">OpenAI</MenuItem>
                            <MenuItem value="anthropic">Anthropic Claude</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel>Model</InputLabel>
                        <Select
                            value={model}
                            label="Model"
                            onChange={(e) => setModel(e.target.value)}
                        >
                            {staticProviders[provider as keyof typeof staticProviders]?.models.map((m: string) => (
                                <MenuItem key={m} value={m}>{m}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        label="API Key"
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={`Enter your ${staticProviders[provider as keyof typeof staticProviders]?.name || 'API'} key`}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        edge="end"
                                    >
                                        {showApiKey ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    {config && (
                        <Alert severity="info">
                            Current status: {config.status === 'connected' ? 'Connected' : 'Disconnected'}
                            {config.setBy === 'researcher' && ' (set by researcher)'}
                            {config.setBy === 'user' && ' (set by user)'}
                        </Alert>
                    )}

                    {error && (
                        <Alert severity="error">{error}</Alert>
                    )}

                    {success && (
                        <Alert severity="success">API key pushed successfully!</Alert>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                {config && (
                    <Button
                        onClick={handleDisconnect}
                        color="error"
                        disabled={disconnecting}
                        startIcon={disconnecting ? <CircularProgress size={20} /> : <CloseIcon />}
                    >
                        {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </Button>
                )}
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handlePushApiKey}
                    variant="contained"
                    disabled={pushing || !provider || !model || !apiKey}
                    startIcon={pushing ? <CircularProgress size={20} /> : <SendIcon />}
                >
                    {pushing ? 'Pushing...' : 'Push to Session'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

