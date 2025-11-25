import React, { useState, useEffect } from 'react';
import {
    Box,
    Chip,
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
    IconButton,
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Send as SendIcon,
    Visibility,
    VisibilityOff,
    Close as CloseIcon,
} from '@mui/icons-material';
import { getAIConfig, setAIConfig, deleteAIConfig, type AISessionConfigStatus } from '../services/sessionAIConfig';
import type { AIProvider } from '../services/ai';
import type { SessionMode } from '../services/sessionManager';

interface SessionAIConnectionStatusProps {
    sessionId: string;
    mode?: SessionMode;
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

export const SessionAIConnectionStatus: React.FC<SessionAIConnectionStatusProps> = ({ sessionId, mode }) => {
    const [config, setConfig] = useState<AISessionConfigStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [pushing, setPushing] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    
    // Form state
    const [provider, setProvider] = useState<AIProvider>('google');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('gemini-2.5-flash');
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

    const handleDisconnect = async () => {
        if (!config || disconnecting) {
            return;
        }
        
        const confirmed = typeof window === 'undefined'
            ? true
            : window.confirm('Disconnect AI provider from this session? This will remove the stored API key.');
        if (!confirmed) {
            return;
        }

        setDisconnecting(true);
        setError(null);
        setSuccess(false);

        try {
            await deleteAIConfig(sessionId);
            setConfig(null);
            setApiKey('');
            await loadConfig(true);
        } catch (error: any) {
            const errorMessage = error.message || 'Failed to disconnect AI provider';
            setError(errorMessage);
            console.error('[SessionAIConnectionStatus] Failed to disconnect AI config:', error);
        } finally {
            setDisconnecting(false);
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
            console.log('[SessionAIConnectionStatus] Pushed to session:', sessionId);
            setSuccess(true);
            
            // Verify the push succeeded by immediately checking if we can retrieve it
            // Retry a few times in case of database commit delay
            let verified = false;
            for (let attempt = 0; attempt < 5; attempt++) {
                await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
                try {
                    const verifyConfig = await getAIConfig(sessionId);
                    if (verifyConfig && verifyConfig.status === 'connected') {
                        console.log('[SessionAIConnectionStatus] Verified API key was saved (attempt', attempt + 1, ')');
                        verified = true;
                        break;
                    }
                } catch (verifyError) {
                    console.log('[SessionAIConnectionStatus] Verification attempt', attempt + 1, 'failed:', verifyError);
                }
            }
            
            if (!verified) {
                console.warn('[SessionAIConnectionStatus] Could not verify API key was saved after push');
            }
            
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
        // In experimental mode, always show purple regardless of AI config
        if (mode === 'experimental') {
            return 'default'; // We'll override with custom purple color in sx
        }
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
        // In experimental mode, always show "Experimental Mode" regardless of AI config
        if (mode === 'experimental') {
            return 'Experimental Mode';
        }
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
                    onDelete={config ? handleDisconnect : undefined}
                    deleteIcon={
                        config ? (
                            <Tooltip title={disconnecting ? 'Disconnecting…' : 'Disconnect'}>
                                <Box component="span" sx={{ display: 'flex' }}>
                                    {disconnecting ? (
                                        <CircularProgress size={16} color="inherit" />
                                    ) : (
                                        <CloseIcon sx={{ color: '#ffffff' }} fontSize="small" />
                                    )}
                                </Box>
                            </Tooltip>
                        ) : undefined
                    }
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
                        backgroundColor: mode === 'experimental' ? 'rgba(156, 39, 176, 0.9)' : // Purple for experimental mode
                                       config?.status === 'connected' ? 'rgba(76, 175, 80, 0.9)' : 
                                       config?.status === 'error' ? 'rgba(244, 67, 54, 0.9)' : 
                                       'rgba(158, 158, 158, 0.7)',
                        '&:hover': {
                            backgroundColor: mode === 'experimental' ? 'rgba(156, 39, 176, 1)' : // Purple hover for experimental mode
                                           config?.status === 'connected' ? 'rgba(76, 175, 80, 1)' : 
                                           config?.status === 'error' ? 'rgba(244, 67, 54, 1)' : 
                                           'rgba(158, 158, 158, 0.9)',
                        }
                    }}
                />
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
                            onClick={async () => {
                                await handleDisconnect();
                                setSettingsOpen(false);
                            }}
                            color="error"
                            disabled={disconnecting}
                            startIcon={disconnecting ? <CircularProgress size={20} /> : <CloseIcon />}
                        >
                            {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                        </Button>
                    )}
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

