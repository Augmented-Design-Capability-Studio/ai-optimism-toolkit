/**
 * Authentication wrapper for researcher dashboard
 * Simple password-based protection
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
}

const STORAGE_KEY = 'researcher_auth_token';
const AUTH_PASSWORD = process.env.NEXT_PUBLIC_RESEARCHER_PASSWORD || 'researcher123'; // Change this!

export function ResearcherAuthWrapper({ children }: AuthWrapperProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing auth on mount
    useEffect(() => {
        const token = localStorage.getItem(STORAGE_KEY);
        if (token === AUTH_PASSWORD) {
            setIsAuthenticated(true);
        }
        setIsLoading(false);
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();

        if (password === AUTH_PASSWORD) {
            localStorage.setItem(STORAGE_KEY, password);
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Invalid password. Please try again.');
            setPassword('');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem(STORAGE_KEY);
        setIsAuthenticated(false);
        setPassword('');
    };

    if (isLoading) {
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
                                Researcher Access
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Enter password to access the researcher dashboard
                            </Typography>
                        </Box>

                        <form onSubmit={handleLogin}>
                            <TextField
                                fullWidth
                                type="password"
                                label="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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
                                Access Dashboard
                            </Button>
                        </form>

                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
                            Tip: Set NEXT_PUBLIC_RESEARCHER_PASSWORD in .env.local
                        </Typography>
                    </Paper>
                </Box>
            </Container>
        );
    }

    // Render children with logout option
    return (
        <>
            {typeof children === 'function' ? children(handleLogout) : children}
            {/* Hidden logout button - can be accessed via keyboard shortcut or added to UI */}
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 16,
                    right: 16,
                    opacity: 0.3,
                    '&:hover': { opacity: 1 },
                }}
            >
                <Button
                    size="small"
                    variant="outlined"
                    onClick={handleLogout}
                    sx={{ fontSize: '0.7rem' }}
                >
                    Logout
                </Button>
            </Box>
        </>
    );
}
