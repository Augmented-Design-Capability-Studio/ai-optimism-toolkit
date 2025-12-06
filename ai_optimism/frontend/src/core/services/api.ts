import { apiClient } from '../lib/apiClient';

export interface Variable {
    name: string;
    type: 'numerical' | 'categorical';
    // Numerical properties
    min?: number;
    max?: number;
    unit?: string;
    // Categorical properties
    categories?: string[];
    modifier_strategy?: 'cycle' | 'random';  // Only for categorical variables
}

export interface OptimizationProblem {
    name: string;
    description?: string;
    variables: Variable[];
    objective_function: string;
    constraints?: string[];
}export interface OptimizationConfig {
    problem_id: string;
    population_size: number;
    max_iterations: number;
    convergence_threshold: number;
}

export interface OptimizationResult {
    status: string;
    message: string;
    iterations?: number;
    best_design?: Record<string, number>;
    best_score?: number;
}

const api = {
    // Create a new optimization problem
    createProblem: async (problem: OptimizationProblem) => {
        const response = await apiClient.post('/optimization/problems/', problem);
        return response.data;
    },

    // List all optimization problems
    listProblems: async () => {
        const response = await apiClient.get('/optimization/problems/');
        return response.data;
    },

    // Execute optimization
    executeOptimization: async (config: OptimizationConfig) => {
        const response = await apiClient.post('/optimization/execute/', config);
        return response.data;
    }
};

export default api;