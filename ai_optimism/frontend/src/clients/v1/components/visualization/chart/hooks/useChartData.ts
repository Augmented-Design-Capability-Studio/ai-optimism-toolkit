import { useMemo } from 'react';
import { prepareChartData } from '../utils/dataProcessing';
import type { ChartData, ChartVizProps } from '../types';

export function useChartData(data: ChartVizProps['data']): ChartData | null {
    return useMemo(() => {
        if (!data) return null;
        return prepareChartData(data);
    }, [data]);
}

