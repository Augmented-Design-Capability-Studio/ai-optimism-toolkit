import React, { useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    TextField,
    Typography,
} from '@mui/material';
import './styles.css';
import type { OptimizationConfig } from '../services/api';

interface OptimizationFormProps {
    problemId: string;
    onSubmit: (config: OptimizationConfig) => void;
}

export const OptimizationForm: React.FC<OptimizationFormProps> = ({ problemId, onSubmit }) => {
    const [config, setConfig] = useState<OptimizationConfig>({
        problem_id: problemId,
        population_size: 50,
        max_iterations: 100,
        convergence_threshold: 0.001,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(config);
    };

    return (
        <Card className="form-container">
            <CardContent className="form-content">
                <Box component="form" onSubmit={handleSubmit} className="form-field">
                    <Typography variant="h5" align="center" gutterBottom>
                        Configure Stopping Criteria
                    </Typography>

                    <Box className="form-field">
                        <TextField
                            fullWidth
                            type="number"
                            label="Population Size"
                            value={config.population_size}
                            onChange={(e) => setConfig({ ...config, population_size: Number(e.target.value) })}
                            required
                            size="small"
                            sx={{ mb: 2 }}
                            helperText="Number of design candidates in each generation"
                        />

                        <TextField
                            fullWidth
                            type="number"
                            label="Maximum Iterations"
                            value={config.max_iterations}
                            onChange={(e) => setConfig({ ...config, max_iterations: Number(e.target.value) })}
                            required
                            size="small"
                            sx={{ mb: 2 }}
                            helperText="Maximum number of generations to run"
                        />

                        <TextField
                            fullWidth
                            type="number"
                            inputProps={{ step: 0.001 }}
                            label="Convergence Threshold"
                            value={config.convergence_threshold}
                            onChange={(e) => setConfig({ ...config, convergence_threshold: Number(e.target.value) })}
                            required
                            size="small"
                            sx={{ mb: 3 }}
                            helperText="Minimum improvement required to continue optimization"
                        />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                        <Button type="submit" variant="contained" color="primary">
                            Start Optimization
                        </Button>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};