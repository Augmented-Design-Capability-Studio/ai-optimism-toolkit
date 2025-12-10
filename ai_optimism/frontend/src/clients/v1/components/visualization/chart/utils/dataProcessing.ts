import type { OptimizationResult, ChartData } from '../types';

/**
 * Extract and prepare chart data from optimization results
 */
export const prepareChartData = (data: any): ChartData | null => {
    // Check multiple possible data structures
    const results = data?.results || data?.data?.results || null;
    
    if (!results || !Array.isArray(results) || results.length === 0) {
        console.log('[ChartViz] No results found or empty array');
        return null;
    }

    console.log('[ChartViz] Processing', results.length, 'results');
    
    // Get all objective names (including constraint violations)
    const allObjectives = new Set<string>();
    results.forEach((result: OptimizationResult) => {
        if (result.objectives) {
            Object.keys(result.objectives).forEach(obj => allObjectives.add(obj));
        }
    });
    
    // Separate objectives from constraint violations
    const objectivesOnly = Array.from(allObjectives).filter(
        obj => !obj.startsWith('Violation:') && !obj.startsWith('Violation(')
    );
    const constraintsOnly = Array.from(allObjectives).filter(
        obj => obj.startsWith('Violation:') || obj.startsWith('Violation(')
    );
    const objectiveList = Array.from(allObjectives);

    // Prepare data for charts
    const paretoData = results.map((result, index) => {
        const dataPoint: any = {
            rank: index + 1,
            score: result.score,
            variables: result.variables,
            objectives: result.objectives,
        };
        
        // Spread objectives so they're accessible as data keys
        if (result.objectives) {
            Object.entries(result.objectives).forEach(([key, value]) => {
                dataPoint[key] = value;
            });
        }
        
        return dataPoint;
    });

    console.log('[ChartViz] Prepared paretoData sample:', paretoData[0]);
    console.log('[ChartViz] ParetoData length:', paretoData.length);

    // Extract problem info if available
    const problem = data?.problem || null;
    const variables = problem?.variables || [];
    const constraints = problem?.constraints || [];
    const objectives = problem?.objectives || [];

    return {
        paretoData,
        objectiveList,
        objectivesOnly,
        constraintsOnly,
        results,
        variables,
        constraints,
        objectives,
    };
};

