import axios from 'axios';

const API_URL = '/api';

export interface Variable {
  name: string;
  type: 'numerical' | 'categorical';
  // Numerical properties
  min?: number;
  max?: number;
  unit?: string;
  // Categorical properties
  categories?: string[];
}

export interface OptimizationProblem {
  name: string;
  description?: string;
  variables: Variable[];
  objective_function: string;
  constraints?: string[];
  categorical_modifier_strategy?: 'cycle' | 'random';
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
        const response = await axios.post(`${API_URL}/optimization/problems/`, problem);
        return response.data;
    },

    // List all optimization problems
    listProblems: async () => {
        const response = await axios.get(`${API_URL}/optimization/problems/`);
        return response.data;
    },

    // Execute optimization
    executeOptimization: async (config: OptimizationConfig) => {
        const response = await axios.post(`${API_URL}/optimization/execute/`, config);
        return response.data;
    }
};

export default api;