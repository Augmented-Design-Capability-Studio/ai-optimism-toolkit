export interface OptimizationResult {
    variables: Record<string, number | string>;
    score: number;
    objectives: Record<string, number>;
}

export interface ChartVizProps {
    data?: {
        results?: OptimizationResult[];
        heuristic_map?: {
            objectives?: string[];
            modifiers?: string[];
            weights?: Record<string, Record<string, number>>;
        };
        objective_bounds?: Record<string, { min?: number; max?: number }>;
        problem?: {
            variables?: Array<{ name: string; type: string; min?: number; max?: number }>;
            objectives?: Array<{ name: string; expression: string }>;
            constraints?: Array<{ expression: string; title?: string; type?: string }>;
        };
    };
}

export type ChartType = 'pareto' | 'variable-space' | 'convergence';

export interface ChartData {
    paretoData: Array<{
        rank: number;
        score: number;
        variables: Record<string, number | string>;
        objectives: Record<string, number>;
        [key: string]: any;
    }>;
    objectiveList: string[];
    objectivesOnly: string[];
    constraintsOnly: string[];
    results: OptimizationResult[];
    variables: Array<{ name: string; type: string; min?: number; max?: number }>;
    constraints: Array<{ expression: string; title?: string; type?: string }>;
    objectives: Array<{ name: string; expression: string }>;
}

export interface AxisOption {
    value: string;
    label: string;
    type: 'metric' | 'objective' | 'constraint';
}

