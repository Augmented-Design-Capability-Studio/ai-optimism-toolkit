export interface OptimizationResult {
    variables: Record<string, number | string>;
    score: number;
    objectives: Record<string, number>;
}

export interface TableVizProps {
    data?: {
        results?: OptimizationResult[];
        heuristic_map?: {
            objectives?: string[];
            modifiers?: string[];
            weights?: Record<string, Record<string, number>>;
        };
        objective_bounds?: Record<string, { min?: number; max?: number }>;
    };
}

export type SortOrder = 'asc' | 'desc';
export type SortField = 'rank' | 'score' | string;

export interface TableRow {
    rank: number;
    score: number;
    variables: Record<string, number | string>;
    objectives: Record<string, number>;
}

export interface TableData {
    rows: TableRow[];
    variableNames: string[];
    objectives: string[];
    constraints: string[];
}

