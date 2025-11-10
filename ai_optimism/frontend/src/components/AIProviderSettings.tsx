import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    CircularProgress,
    InputAdornment,
    IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAIProvider } from '../contexts/AIProviderContext';
import aiApi from '../services/ai';
import type { AIProvider, ProvidersResponse } from '../services/ai';

interface AIProviderSettingsProps {
    open: boolean;
    onClose: () => void;
}

export const AIProviderSettings: React.FC<AIProviderSettingsProps> = ({ open, onClose }) => {
    const { state, connect } = useAIProvider();
    const [provider, setProvider] = useState<AIProvider>('google');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('');
    const [endpoint, setEndpoint] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [providers, setProviders] = useState<ProvidersResponse | null>(null);

    // Load providers list on mount
    useEffect(() => {
        const loadProviders = async () => {
            try {
                const data = await aiApi.listProviders();
                setProviders(data);
                // Set default model for initial provider
                if (data.providers[provider]?.models.length > 0) {
                    setModel(data.providers[provider].models[0]);
                }
            } catch (e) {
                console.error('Failed to load providers:', e);
            }
        };
        loadProviders();
    }, []);

    // Load saved config when dialog opens
    useEffect(() => {
        if (open && state.provider) {
            setProvider(state.provider);
            setApiKey(state.apiKey || '');
            setModel(state.model || '');
            setEndpoint(state.endpoint || '');
        }
    }, [open, state]);

    // Update default model when provider changes
    useEffect(() => {
        if (providers && providers.providers[provider]) {
            const providerInfo = providers.providers[provider];
            if (providerInfo.models.length > 0 && !model) {
                setModel(providerInfo.models[0]);
            }
            if (providerInfo.endpoint) {
                setEndpoint(providerInfo.endpoint);
            }
        }
    }, [provider, providers]);

    const handleConnect = async () => {
        setError(null);
        setSuccess(false);
        setIsConnecting(true);

        const connected = await connect(provider, apiKey, model, endpoint || undefined);

        setIsConnecting(false);

        if (connected) {
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 1500);
        } else {
            setError(state.errorMessage || 'Connection failed');
        }
    };

    const requiresApiKey = providers?.providers[provider]?.requires_api_key !== false;
    const requiresEndpoint = provider === 'ollama' || provider === 'custom';

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>AI Provider Settings</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    {/* Security Warning */}
                    <Alert severity="warning">
                        API keys are stored locally in your browser. Never share your keys with others.
                    </Alert>

                    {/* Provider Selection */}
                    <FormControl fullWidth>
                        <InputLabel>Provider</InputLabel>
                        <Select
                            value={provider}
                            label="Provider"
                            onChange={(e) => setProvider(e.target.value as AIProvider)}
                        >
                            <MenuItem value="google">Google Gemini</MenuItem>
                            <MenuItem value="openai" disabled sx={{ color: 'text.disabled' }}>
                                OpenAI (Not Available)
                            </MenuItem>
                            <MenuItem value="anthropic" disabled sx={{ color: 'text.disabled' }}>
                                Anthropic Claude (Not Available)
                            </MenuItem>
                            <MenuItem value="ollama" disabled sx={{ color: 'text.disabled' }}>
                                Ollama (Not Available)
                            </MenuItem>
                            <MenuItem value="custom" disabled sx={{ color: 'text.disabled' }}>
                                Custom Endpoint (Not Available)
                            </MenuItem>
                        </Select>
                    </FormControl>

                    {/* Model Selection */}
                    <FormControl fullWidth>
                        <InputLabel>Model</InputLabel>
                        <Select
                            value={model}
                            label="Model"
                            onChange={(e) => setModel(e.target.value)}
                        >
                            {providers?.providers[provider]?.models.map((m) => (
                                <MenuItem key={m} value={m}>{m}</MenuItem>
                            ))}
                            {(!providers || providers.providers[provider]?.models.length === 0) && (
                                <MenuItem value="">Enter custom model name below</MenuItem>
                            )}
                        </Select>
                    </FormControl>

                    {/* Custom model name if list is empty */}
                    {(!providers || providers.providers[provider]?.models.length === 0) && (
                        <TextField
                            fullWidth
                            label="Model Name"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            placeholder="e.g., gpt-4"
                        />
                    )}

                    {/* API Key */}
                    {requiresApiKey && (
                        <TextField
                            fullWidth
                            label="API Key"
                            type={showApiKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={`Enter your ${providers?.providers[provider]?.name || 'API'} key`}
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
                    )}

                    {/* Endpoint URL */}
                    {requiresEndpoint && (
                        <TextField
                            fullWidth
                            label="Endpoint URL"
                            value={endpoint}
                            onChange={(e) => setEndpoint(e.target.value)}
                            placeholder={
                                provider === 'ollama'
                                    ? 'http://localhost:11434'
                                    : 'https://your-endpoint.com'
                            }
                        />
                    )}

                    {/* Error Message */}
                    {error && (
                        <Alert severity="error">{error}</Alert>
                    )}

                    {/* Success Message */}
                    {success && (
                        <Alert severity="success">Successfully connected!</Alert>
                    )}

                    {/* Current Status */}
                    {state.status === 'connected' && (
                        <Alert severity="info">
                            Currently connected to {state.provider} - {state.model}
                        </Alert>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleConnect}
                    variant="contained"
                    disabled={
                        isConnecting ||
                        !provider ||
                        !model ||
                        (requiresApiKey && !apiKey) ||
                        (requiresEndpoint && !endpoint)
                    }
                    startIcon={isConnecting && <CircularProgress size={20} />}
                >
                    {isConnecting ? 'Connecting...' : 'Connect'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
