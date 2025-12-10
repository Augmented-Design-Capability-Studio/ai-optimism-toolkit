import { useMemo } from 'react';
import type { TableVizProps, TableData } from '../types';

export function useTableData(data: TableVizProps['data']): TableData | null {
    return useMemo(() => {
        if (!data?.results || data.results.length === 0) {
            return null;
        }

        const results = data.results;
        
        // Get all variable names
        const variableNames = new Set<string>();
        // Get all objective names
        const objectiveNames = new Set<string>();
        
        results.forEach(result => {
            if (result.variables) {
                Object.keys(result.variables).forEach(v => variableNames.add(v));
            }
            if (result.objectives) {
                Object.keys(result.objectives).forEach(o => objectiveNames.add(o));
            }
        });

        // Separate objectives from constraint violations
        const objectives = Array.from(objectiveNames).filter(
            o => !o.startsWith('Violation:') && !o.startsWith('Violation(')
        );
        const constraints = Array.from(objectiveNames).filter(
            o => o.startsWith('Violation:') || o.startsWith('Violation(')
        );

        // Prepare table rows with rank
        const rows = results.map((result, index) => ({
            rank: index + 1,
            score: result.score,
            variables: result.variables || {},
            objectives: result.objectives || {},
        }));

        return {
            rows,
            variableNames: Array.from(variableNames),
            objectives,
            constraints,
        };
    }, [data]);
}

