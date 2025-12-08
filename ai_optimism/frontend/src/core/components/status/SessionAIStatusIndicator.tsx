'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Box, Chip, Tooltip, CircularProgress } from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import type { SessionMode, AISessionConfigStatus as SessionAIConfig } from '../../services/sessionManager';

interface SessionAIStatusIndicatorProps {
    sessionId: string;
    mode?: SessionMode;
    onClick?: () => void;
    onDisconnect?: () => void;
    aiConfig?: SessionAIConfig | null;  // Optional: if provided, use this instead of polling
}

export const SessionAIStatusIndicator: React.FC<SessionAIStatusIndicatorProps> = ({ 
    sessionId, 
    mode,
    onClick,
    onDisconnect,
    aiConfig: aiConfigProp,  // Use aiConfig from session if provided
}) => {
    const [config, setConfig] = useState<SessionAIConfig | null>(aiConfigProp || null);
    const [disconnecting, setDisconnecting] = useState(false);

    // Update config when prop changes (from session updates)
    // AI config is now always included in session response, so no separate API call needed
    useEffect(() => {
        setConfig(aiConfigProp || null);
    }, [aiConfigProp]);

    const handleDisconnect = async () => {
        if (!config || disconnecting || !onDisconnect) {
            return;
        }
        
        const confirmed = typeof window === 'undefined'
            ? true
            : window.confirm('Disconnect AI provider from this session? This will remove the stored API key.');
        if (!confirmed) {
            return;
        }

        setDisconnecting(true);
        try {
            await onDisconnect();
            // Config will be updated via prop when session refreshes
            setConfig(null);
        } finally {
            setDisconnecting(false);
        }
    };

    const getStatusColor = () => {
        if (mode === 'experimental') {
            return 'default';
        }
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
        if (mode === 'experimental') {
            return 'Experimental Mode';
        }
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
                label={getStatusLabel()}
                color={getStatusColor()}
                size="medium"
                icon={getStatusIcon() || undefined}
                onClick={onClick}
                onDelete={config && onDisconnect ? handleDisconnect : undefined}
                deleteIcon={
                    config && onDisconnect ? (
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
                    cursor: onClick ? 'pointer' : 'default',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    color: '#ffffff',
                    '& .MuiChip-label': {
                        px: 2,
                    },
                    '& .MuiChip-icon': {
                        color: '#ffffff',
                    },
                    backgroundColor: mode === 'experimental' ? 'rgba(156, 39, 176, 0.9)' :
                                   config?.status === 'connected' ? 'rgba(76, 175, 80, 0.9)' : 
                                   config?.status === 'error' ? 'rgba(244, 67, 54, 0.9)' : 
                                   'rgba(158, 158, 158, 0.7)',
                    '&:hover': {
                        backgroundColor: mode === 'experimental' ? 'rgba(156, 39, 176, 1)' :
                                       config?.status === 'connected' ? 'rgba(76, 175, 80, 1)' : 
                                       config?.status === 'error' ? 'rgba(244, 67, 54, 1)' : 
                                       'rgba(158, 158, 158, 0.9)',
                    }
                }}
            />
        </Box>
    );
};



