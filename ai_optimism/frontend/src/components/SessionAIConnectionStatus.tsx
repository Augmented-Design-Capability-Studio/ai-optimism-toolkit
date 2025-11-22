import React, { useState, useEffect } from 'react';
import {
    Box,
    Chip,
    IconButton,
    Tooltip,
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
} from '@mui/material';
import {
    Settings as SettingsIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Send as SendIcon,
    Visibility,
    VisibilityOff,
} from '@mui/icons-material';
import { getAIConfig, setAIConfig, type AISessionConfigStatus } from '../services/sessionAIConfig';
import type { AIProvider } from '../services/ai';

interface SessionAIConnectionStatusProps {
    sessionId: string;
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

export const SessionAIConnectionStatus: React.FC<SessionAIConnectionStatusProps> = ({ sessionId }) => {
    const [config, setConfig] = useState<AISessionConfigStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [pushing, setPushing] = useState(false);
    
    // Form state
    const [provider, setProvider] = useState<AIProvider>('google');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('gemini-2.0-flash');
    const [showApiKey, setShowApiKey] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const loadConfig = async (showLoading = false) => {
        if (showLoading) {
            setLoading(true);
        }
        
        try {
            const sessionConfig = await getAIConfig(sessionId);
            setConfig(sessionConfig);
            if (sessionConfig) {
                setProvider(sessionConfig.provider as AIProvider);
                setModel(sessionConfig.model);
                console.log('[SessionAIConnectionStatus] Config loaded:', sessionConfig.status, sessionConfig.provider, sessionConfig.model);
            } else {
                setConfig(null);
            }
        } catch (error: any) {
            // 404 means no config exists yet - this is expected
            if (error.response?.status === 404) {
                setConfig(null);
            } else {
                console.error('[SessionAIConnectionStatus] Failed to load config:', error);
            }
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    };

    // Load session AI config and poll for updates
    useEffect(() => {
        if (!sessionId) return;

        // Load immediately with loading indicator
        loadConfig(true);

        // Poll for updates every 3 seconds (in case config changes, no loading indicator)
        const interval = setInterval(() => loadConfig(false), 3000);

        return () => clearInterval(interval);
    }, [sessionId]);

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
            
            console.log('[SessionAIConnectionStatus] API key pushed successfully:', result);
            setSuccess(true);
            
            // Small delay to ensure backend has processed
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Reload config immediately to show updated status (with loading indicator)
            await loadConfig(true);
            
            // Clear form after success
            setTimeout(() => {
                setSettingsOpen(false);
                setSuccess(false);
                setApiKey(''); // Clear API key from form for security
            }, 1500);
        } catch (error: any) {
            const errorMessage = error.message || error.response?.data?.detail || 'Failed to push API key to session';
            setError(errorMessage);
            console.error('[SessionAIConnectionStatus] Failed to push API key:', error);
            console.error('[SessionAIConnectionStatus] Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
            });
        } finally {
            setPushing(false);
        }
    };

    const getStatusColor = () => {
        if (loading) return 'default';
        if (!config) return 'default';
        switch (config.status) {
            case 'connected':
                return 'success';
            case 'error':
                return 'error';
            default:
                return 'default';
        }
    };

    const getStatusIcon = () => {
        if (loading) return null;
        if (!config) return null;
        switch (config.status) {
            case 'connected':
                return <CheckCircleIcon fontSize="small" />;
            case 'error':
                return <ErrorIcon fontSize="small" />;
            default:
                return null;
        }
    };

    const getStatusLabel = () => {
        if (loading) return 'Loading...';
        if (!config) return 'No AI Config';
        if (config.status === 'connected') {
            return `${config.provider}: ${config.model}`;
        }
        if (config.status === 'error') {
            return `Error: ${config.errorMessage || 'Connection failed'}`;
        }
        return 'Disconnected';
    };

    return (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                    label={getStatusLabel()}
                    color={getStatusColor()}
                    size="medium"
                    icon={getStatusIcon() || undefined}
                    onClick={() => setSettingsOpen(true)}
                    sx={{ 
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: 500,
                        color: '#ffffff',
                        '& .MuiChip-label': {
                            px: 2,
                        },
                        '& .MuiChip-icon': {
                            color: '#ffffff',
                        },
                        backgroundColor: config?.status === 'connected' ? 'rgba(76, 175, 80, 0.9)' : 
                                       config?.status === 'error' ? 'rgba(244, 67, 54, 0.9)' : 
                                       'rgba(158, 158, 158, 0.7)',
                        '&:hover': {
                            backgroundColor: config?.status === 'connected' ? 'rgba(76, 175, 80, 1)' : 
                                           config?.status === 'error' ? 'rgba(244, 67, 54, 1)' : 
                                           'rgba(158, 158, 158, 0.9)',
                        }
                    }}
                />
                
                <Tooltip title="Push API Key to Session">
                    <IconButton
                        size="small"
                        onClick={() => setSettingsOpen(true)}
                        color="primary"
                    >
                        <SettingsIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>

            <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
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
                                    setProvider(e.target.value as AIProvider);
                                    const providerInfo = staticProviders[e.target.value as AIProvider];
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
                                {staticProviders[provider]?.models.map((m: string) => (
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
                            placeholder={`Enter your ${staticProviders[provider]?.name || 'API'} key`}
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
                    <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
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
        </>
    );
};

