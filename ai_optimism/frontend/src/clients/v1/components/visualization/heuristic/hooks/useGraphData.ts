import { useState, useEffect } from 'react';
import type { HeuristicMapData } from '../types';

const DEFAULT_DATA: HeuristicMapData = {
    objectives: ['Violation(A+R)', 'Violation(R>=10k)', 'Max Profit'],
    modifiers: ['inc_A', 'dec_A', 'inc_R', 'dec_R'],
    weights: {
        'Violation(A+R)': { 'dec_A': 1.0, 'dec_R': 1.0, 'inc_A': -0.5, 'inc_R': -0.5 },
        'Violation(R>=10k)': { 'inc_R': 1.0, 'dec_R': -1.0 },
        'Max Profit': { 'inc_A': 0.8, 'inc_R': 0.2 }
    }
};

export function useGraphData(data: any): HeuristicMapData | null {
    const [localData, setLocalData] = useState<HeuristicMapData | null>(null);

    useEffect(() => {
        if (data?.heuristic_map) {
            setLocalData(JSON.parse(JSON.stringify(data.heuristic_map)));
        } else if (!localData) {
            // Default dummy data if nothing provided
            setLocalData(DEFAULT_DATA);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    return localData;
}

