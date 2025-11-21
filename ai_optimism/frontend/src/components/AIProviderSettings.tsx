import { useState, useEffect } from 'react';
import {
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
    IconButton,
    InputAdornment,
    Alert,
    CircularProgress,
    Box,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAIProvider } from '../contexts/AIProviderContext';
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
    
    // Static provider configuration (no backend needed)
    const staticProviders: ProvidersResponse = {
        providers: {
            google: {
                name: 'Google (Gemini)',
                models: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'],
                requires_api_key: true,
                endpoint: null,
            },
            openai: {
                name: 'OpenAI',
                models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
                requires_api_key: true,
                endpoint: null,
            },
            anthropic: {
                name: 'Anthropic (Claude)',
                models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
                requires_api_key: true,
                endpoint: null,
            },
            ollama: {
                name: 'Ollama (Local)',
                models: ['llama2', 'mistral', 'codellama', 'phi'],
                requires_api_key: false,
                endpoint: 'http://localhost:11434',
            },
            custom: {
                name: 'Custom Endpoint',
                models: ['custom-model'],
                requires_api_key: true,
                endpoint: null,
            },
        },
    };

    // Load saved config when dialog opens
    useEffect(() => {
        if (open && state.provider) {
            setProvider(state.provider);
            setApiKey(state.apiKey || '');
            setModel(state.model || staticProviders.providers[state.provider]?.models[0] || '');
            setEndpoint(state.endpoint || '');
        } else if (open) {
            // Set default model for initial provider
            const defaultModel = staticProviders.providers[provider]?.models[0];
            if (defaultModel && !model) {
                setModel(defaultModel);
            }
        }
    }, [open, state]);

    // Update default model when provider changes
    useEffect(() => {
        const providerInfo = staticProviders.providers[provider];
        if (providerInfo) {
            if (providerInfo.models.length > 0 && !model) {
                setModel(providerInfo.models[0]);
            }
            if (providerInfo.endpoint && !endpoint) {
                setEndpoint(providerInfo.endpoint);
            }
        }
    }, [provider]);

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
            setError(state.errorMessage || 'AI connection failed');
        }
    };

    const requiresApiKey = staticProviders.providers[provider]?.requires_api_key !== false;
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
                            {staticProviders.providers[provider]?.models.map((m: string) => (
                                <MenuItem key={m} value={m}>{m}</MenuItem>
                            ))}
                            {staticProviders.providers[provider]?.models.length === 0 && (
                                <MenuItem value="">Enter custom model name below</MenuItem>
                            )}
                        </Select>
                    </FormControl>

                    {/* Custom model name if list is empty */}
                    {staticProviders.providers[provider]?.models.length === 0 && (
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
                            placeholder={`Enter your ${staticProviders.providers[provider]?.name || 'API'} key`}
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
