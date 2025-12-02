/**
 * Shared authentication wrapper component
 * Used by both client and researcher interfaces
 */

'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    TextField,
    Button,
    Typography,
    Alert,
    Container,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

interface AuthWrapperProps {
    children: React.ReactNode | ((logout: () => void) => React.ReactNode);
    storageKey: string;
    password: string;
    title: string;
    subtitle: string;
    buttonLabel: string;
    passwordLabel?: string;
    errorMessage?: string;
    envVarName?: string;
    showLoadingState?: boolean;
}

export function AuthWrapper({
    children,
    storageKey,
    password,
    title,
    subtitle,
    buttonLabel,
    passwordLabel = 'Password',
    errorMessage = 'Invalid password. Please try again.',
    envVarName,
    showLoadingState = false,
}: AuthWrapperProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(showLoadingState);

    // Check for existing auth on mount
    useEffect(() => {
        const token = localStorage.getItem(storageKey);
        if (token === password) {
            setIsAuthenticated(true);
        }
        if (showLoadingState) {
            setIsLoading(false);
        }
    }, [storageKey, password, showLoadingState]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordInput === password) {
            localStorage.setItem(storageKey, passwordInput);
            setIsAuthenticated(true);
            setError('');
        } else {
            setError(errorMessage);
            setPasswordInput('');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem(storageKey);
        setIsAuthenticated(false);
        setPasswordInput('');
    };

    if (showLoadingState && isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <Typography>Loading...</Typography>
            </Box>
        );
    }

    if (!isAuthenticated) {
        return (
            <Container maxWidth="sm">
                <Box
                    sx={{
                        minHeight: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Paper
                        elevation={3}
                        sx={{
                            p: 4,
                            width: '100%',
                            maxWidth: 400,
                        }}
                    >
                        <Box sx={{ textAlign: 'center', mb: 3 }}>
                            <LockIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                            <Typography variant="h5" fontWeight="bold" gutterBottom>
                                {title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {subtitle}
                            </Typography>
                        </Box>

                        <form onSubmit={handleLogin}>
                            <TextField
                                fullWidth
                                type="password"
                                label={passwordLabel}
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                autoFocus
                                sx={{ mb: 2 }}
                            />

                            {error && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {error}
                                </Alert>
                            )}

                            <Button
                                fullWidth
                                variant="contained"
                                type="submit"
                                size="large"
                            >
                                {buttonLabel}
                            </Button>
                        </form>

                        {envVarName && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
                                Tip: Set {envVarName} in .env
                            </Typography>
                        )}
                    </Paper>
                </Box>
            </Container>
        );
    }

    // Render children with logout option
    return (
        <>
            {typeof children === 'function' ? children(handleLogout) : children}
        </>
    );
}

