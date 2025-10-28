import { useState } from 'react';
import { Container, Box, Typography, Snackbar, Alert, AppBar, Toolbar } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProblemForm } from './components/ProblemForm';
import { OptimizationForm } from './components/OptimizationForm';
import { ResultsDisplay } from './components/ResultsDisplay';
import api from './services/api';
import type { OptimizationProblem, OptimizationConfig, OptimizationResult } from './services/api';

const queryClient = new QueryClient();

function App() {
    const [currentProblemId, setCurrentProblemId] = useState<string | null>(null);
    const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCreateProblem = async (problem: OptimizationProblem) => {
        try {
            const response = await api.createProblem(problem);
            setCurrentProblemId(response.id);
        } catch (err) {
            setError('Failed to create optimization problem');
        }
    };

    const handleOptimize = async (config: OptimizationConfig) => {
        try {
            const result = await api.executeOptimization(config);
            setOptimizationResult(result);
        } catch (err) {
            setError('Failed to execute optimization');
        }
    };

    return (
        <QueryClientProvider client={queryClient}>
            <Box sx={{ height: '100vh' }}>
                <AppBar position="fixed">
                    <Toolbar>
                        <Typography variant="h4" component="h1" sx={{ flexGrow: 1, textAlign: 'center', fontWeight: 'bold' }}>
                            AI OPTIMISM TOOLKIT
                        </Typography>
                    </Toolbar>
                </AppBar>
                <Toolbar /> {/* This toolbar is a spacer */}
                <Box className="app-content">
                    <Container maxWidth={false} sx={{ maxWidth: '1800px', height: '100%', p: 0 }}>
                        <Box className="workflow-container">
                            <Box className={`workflow-step ${!currentProblemId ? 'active' : 'completed'}`}>
                                <div className="step-indicator">
                                    <div className="step-number">1</div>
                                    <Typography variant="subtitle1">Define Problem</Typography>
                                </div>
                                <ProblemForm onSubmit={handleCreateProblem} />
                            </Box>

                            <Box className={`workflow-step ${currentProblemId && !optimizationResult ? 'active' : optimizationResult ? 'completed' : ''}`}>
                                <div className="step-indicator">
                                    <div className="step-number">2</div>
                                    <Typography variant="subtitle1">Configure Optimization</Typography>
                                </div>
                                <OptimizationForm
                                    problemId={currentProblemId || ''}
                                    onSubmit={handleOptimize}
                                />
                            </Box>

                            <Box className={`workflow-step ${optimizationResult ? 'active' : ''}`}>
                                <div className="step-indicator">
                                    <div className="step-number">3</div>
                                    <Typography variant="subtitle1">View Results</Typography>
                                </div>
                                <ResultsDisplay result={optimizationResult || {
                                    status: 'pending',
                                    message: 'Waiting to start optimization...',
                                    iterations: 0,
                                    best_score: 0,
                                    best_design: {}
                                }} />
                            </Box>
                        </Box>
                    </Container>

                    <Snackbar
                        open={!!error}
                        autoHideDuration={6000}
                        onClose={() => setError(null)}
                    >
                        <Alert severity="error" onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    </Snackbar>
                </Box>
            </Box>
        </QueryClientProvider>
    );
}

export default App;
