import React, { useState } from 'react';
import {
    Box,
    Chip,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Settings as SettingsIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Cancel as CancelIcon,
} from '@mui/icons-material';
import { useAIProvider } from '../contexts/AIProviderContext';
import { AIProviderSettings } from './AIProviderSettings';

export const AIConnectionStatus: React.FC = () => {
    const { state, disconnect, isConnected } = useAIProvider();
    const [settingsOpen, setSettingsOpen] = useState(false);

    const getStatusColor = () => {
        switch (state.status) {
            case 'connected':
                return 'success';
            case 'connecting':
                return 'info';
            case 'error':
                return 'error';
            default:
                return 'default';
        }
    };

    const getStatusIcon = () => {
        switch (state.status) {
            case 'connected':
                return <CheckCircleIcon fontSize="small" />;
            case 'error':
                return <ErrorIcon fontSize="small" />;
            default:
                return null;
        }
    };

    const getStatusLabel = () => {
        if (isConnected) {
            return `${state.provider}: ${state.model}`;
        }
        if (state.status === 'connecting') {
            return 'Connecting...';
        }
        if (state.status === 'error') {
            return 'Connection Failed';
        }
        return 'No AI Connected';
    };

    return (
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
                    backgroundColor: state.status === 'connected' ? 'rgba(76, 175, 80, 0.9)' : 
                                   state.status === 'error' ? 'rgba(244, 67, 54, 0.9)' : 
                                   state.status === 'connecting' ? 'rgba(33, 150, 243, 0.9)' : 
                                   'rgba(158, 158, 158, 0.7)',
                    '&:hover': {
                        backgroundColor: state.status === 'connected' ? 'rgba(76, 175, 80, 1)' : 
                                       state.status === 'error' ? 'rgba(244, 67, 54, 1)' : 
                                       state.status === 'connecting' ? 'rgba(33, 150, 243, 1)' : 
                                       'rgba(158, 158, 158, 0.9)',
                    }
                }}
            />
            
            {isConnected && (
                <Tooltip title="Disconnect">
                    <IconButton
                        size="small"
                        onClick={disconnect}
                        sx={{ ml: -0.5 }}
                    >
                        <CancelIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}

            {!isConnected && (
                <Tooltip title="AI Settings">
                    <IconButton
                        size="small"
                        onClick={() => setSettingsOpen(true)}
                        color="primary"
                    >
                        <SettingsIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}

            <AIProviderSettings
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
            />
        </Box>
    );
};
