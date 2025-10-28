import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    List,
    ListItem,
    ListItemText,
    Divider,
} from '@mui/material';
import './styles.css';
import type { OptimizationResult } from '../services/api';

interface ResultsDisplayProps {
    result: OptimizationResult;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result }) => {
    return (
        <Card className="form-container">
            <CardContent className="form-content">
                <Box className="form-field">
                    <Typography variant="h5" align="center" gutterBottom>
                        Optimization Results
                    </Typography>

                    <Box sx={{ mb: 3, textAlign: 'center' }}>
                        <Typography 
                            variant="h6" 
                            color={result.status === 'success' ? 'success.main' : 
                                  result.status === 'pending' ? 'info.main' : 'error.main'}
                            gutterBottom
                        >
                            Status: {result.status}
                        </Typography>

                        <Typography variant="body1" gutterBottom>
                            {result.message}
                        </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                        {result.iterations !== undefined && (
                            <Typography variant="body1" gutterBottom align="center">
                                Total Iterations: {result.iterations}
                            </Typography>
                        )}

                        {result.best_score !== undefined && (
                            <Typography variant="body1" gutterBottom align="center">
                                Best Score: {result.best_score.toFixed(4)}
                            </Typography>
                        )}
                    </Box>

                    {result.best_design && Object.keys(result.best_design).length > 0 && (
                        <Box>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" align="center" sx={{ mb: 2 }}>
                                Best Design Parameters
                            </Typography>
                            <List>
                                {Object.entries(result.best_design).map(([param, value]) => (
                                    <ListItem key={param} sx={{ flexDirection: 'column', alignItems: 'center' }}>
                                        <ListItemText
                                            primary={param}
                                            secondary={typeof value === 'number' ? value.toFixed(2) : value}
                                            primaryTypographyProps={{ align: 'center' }}
                                            secondaryTypographyProps={{ align: 'center' }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};