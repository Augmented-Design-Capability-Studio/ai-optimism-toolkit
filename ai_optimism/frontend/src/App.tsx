import { useState } from 'react';
import { Container, Box, Typography, Snackbar, Alert, AppBar, Toolbar, Button, Card, CardContent } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProblemForm } from './components/ProblemForm';
import { ProblemBasicInfo } from './components/ProblemBasicInfo';
import { OptimizationForm } from './components/OptimizationForm';
import { ResultsDisplay } from './components/ResultsDisplay';
import { AIConnectionStatus } from './components/AIConnectionStatus';
import { AIProviderProvider } from './contexts/AIProviderContext';
import api from './services/api';
import type { OptimizationProblem, OptimizationConfig, OptimizationResult, Variable } from './services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const queryClient = new QueryClient();

interface ProblemData {
    name: string;
    description: string;
    variables: Variable[];
    properties: Array<{name: string, expression: string, description: string}>;
}

function App() {
    const [currentStep, setCurrentStep] = useState(1);
    const [problemData, setProblemData] = useState<ProblemData>({
        name: '',
        description: '',
        variables: [],
        properties: []
    });
    const [objectiveDescription, setObjectiveDescription] = useState('');
    const [objectiveCode, setObjectiveCode] = useState('');
    const [objectiveExplanation, setObjectiveExplanation] = useState('');
    const [constraints, setConstraints] = useState<string[]>([]);
    const [currentProblemId, setCurrentProblemId] = useState<string | null>(null);
    const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleStep1Complete = (data: { name: string; description: string; variables: Variable[] }) => {
        setProblemData(prev => ({ ...prev, ...data }));
        setCurrentStep(2);
    };

    const handleStep2Complete = (properties: Array<{name: string, expression: string, description: string}>) => {
        setProblemData(prev => ({ ...prev, properties }));
        setCurrentStep(3);
    };

    const handleStep3Complete = async (data: { objectiveDescription: string; objectiveCode: string; objectiveExplanation: string; constraints: string[] }) => {
        setObjectiveDescription(data.objectiveDescription);
        setObjectiveCode(data.objectiveCode);
        setObjectiveExplanation(data.objectiveExplanation);
        setConstraints(data.constraints);
        
        // Create the problem
        try {
            const problem: OptimizationProblem = {
                name: problemData.name,
                description: problemData.description,
                variables: problemData.variables,
                objective_function: data.objectiveCode,
                constraints: data.constraints.filter(c => c.trim() !== ''),
            };
            const response = await api.createProblem(problem);
            setCurrentProblemId(response.id);
            setCurrentStep(4);
        } catch (err) {
            setError('Failed to create optimization problem');
        }
    };

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
            setCurrentStep(5);
        } catch (err) {
            setError('Failed to execute optimization');
        }
    };

    const goToStep = (step: number) => {
        setCurrentStep(step);
    };

    return (
        <QueryClientProvider client={queryClient}>
            <AIProviderProvider>
                <Box sx={{ height: '100vh' }}>
                    <AppBar position="fixed">
                        <Toolbar>
                            <Typography variant="h4" component="h1" sx={{ flexGrow: 1, textAlign: 'center', fontWeight: 'bold' }}>
                                AI OPTIMISM TOOLKIT
                            </Typography>
                            <AIConnectionStatus />
                        </Toolbar>
                    </AppBar>
                    <Toolbar /> {/* This toolbar is a spacer */}
                <Box className="app-content">
                    <Container maxWidth={false} sx={{ maxWidth: '1800px', height: '100%', p: 0 }}>
                        <Box className="workflow-container">
                            {/* Step 1: Problem Setup */}
                            <Box className={`workflow-step ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}>
                                <div className="step-indicator">
                                    <div className="step-number">1</div>
                                    <Typography variant="subtitle1">Problem Setup</Typography>
                                </div>
                                <ProblemForm 
                                    onSubmit={handleCreateProblem}
                                    currentStep={1}
                                    onNext={handleStep1Complete}
                                    onBack={null}
                                    initialData={{
                                        name: problemData.name,
                                        description: problemData.description,
                                        variables: problemData.variables
                                    }}
                                />
                            </Box>

                            {/* Step 2: Define Properties */}
                            <Box className={`workflow-step ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}>
                                <div className="step-indicator">
                                    <div className="step-number">2</div>
                                    <Typography variant="subtitle1">Define Properties</Typography>
                                </div>
                                <ProblemForm 
                                    onSubmit={handleCreateProblem}
                                    currentStep={2}
                                    onNext={handleStep2Complete}
                                    onBack={() => goToStep(1)}
                                    initialData={{
                                        variables: problemData.variables,
                                        properties: problemData.properties
                                    }}
                                />
                            </Box>

                            {/* Step 3: Configure Optimization */}
                            <Box className={`workflow-step ${currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : ''}`}>
                                <div className="step-indicator">
                                    <div className="step-number">3</div>
                                    <Typography variant="subtitle1">Configure Optimization</Typography>
                                </div>
                                <ProblemForm 
                                    onSubmit={handleCreateProblem}
                                    currentStep={3}
                                    onNext={handleStep3Complete}
                                    onBack={() => goToStep(2)}
                                    initialData={{
                                        variables: problemData.variables,
                                        properties: problemData.properties,
                                        objectiveDescription,
                                        objectiveCode,
                                        objectiveExplanation,
                                        constraints
                                    }}
                                />
                            </Box>

                            {/* Step 4: Run Optimization */}
                            <Box className={`workflow-step ${currentStep === 4 ? 'active' : currentStep > 4 ? 'completed' : ''}`}>
                                <div className="step-indicator">
                                    <div className="step-number">4</div>
                                    <Typography variant="subtitle1">Run Optimization</Typography>
                                </div>
                                <Card>
                                    <CardContent>
                                        {currentStep >= 4 ? (
                                            <>
                                                {currentStep === 4 && (
                                                    <Box sx={{ mb: 2 }}>
                                                        <Button
                                                            startIcon={<ArrowBackIcon />}
                                                            onClick={() => goToStep(3)}
                                                        >
                                                            Back
                                                        </Button>
                                                    </Box>
                                                )}
                                                <OptimizationForm
                                                    problemId={currentProblemId || ''}
                                                    onSubmit={handleOptimize}
                                                />
                                            </>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                                                Complete previous steps to continue
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            </Box>

                            {/* Step 5: View Results */}
                            <Box className={`workflow-step ${currentStep === 5 ? 'active' : ''}`}>
                                <div className="step-indicator">
                                    <div className="step-number">5</div>
                                    <Typography variant="subtitle1">View Results</Typography>
                                </div>
                                <Card>
                                    <CardContent>
                                        {currentStep >= 5 ? (
                                            <>
                                                <Box sx={{ mb: 2 }}>
                                                    <Button
                                                        startIcon={<ArrowBackIcon />}
                                                        onClick={() => goToStep(4)}
                                                    >
                                                        Back
                                                    </Button>
                                                </Box>
                                                <ResultsDisplay result={optimizationResult || {
                                            status: 'pending',
                                            message: 'Waiting to start optimization...',
                                            iterations: 0,
                                            best_score: 0,
                                            best_design: {}
                                        }} />
                                            </>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                                                Complete previous steps to view results
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
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
            </AIProviderProvider>
        </QueryClientProvider>
    );
}

export default App;
