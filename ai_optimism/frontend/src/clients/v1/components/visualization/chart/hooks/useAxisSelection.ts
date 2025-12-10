import { useState, useEffect } from 'react';
import type { ChartData } from '../types';

export function useAxisSelection(chartData: ChartData | null) {
    const [xAxis, setXAxis] = useState<string>('');
    const [yAxis, setYAxis] = useState<string>('');

    useEffect(() => {
        if (chartData) {
            console.log('[ChartViz] Chart data prepared:', {
                objectiveList: chartData.objectiveList,
                paretoDataLength: chartData.paretoData.length,
                currentXAxis: xAxis,
                currentYAxis: yAxis,
            });
            
            if (!xAxis && !yAxis && chartData.objectivesOnly.length >= 2) {
                console.log('[ChartViz] Auto-selecting first two objectives');
                setXAxis(chartData.objectivesOnly[0]);
                setYAxis(chartData.objectivesOnly[1]);
            } else if (!xAxis && chartData.objectivesOnly.length >= 1) {
                console.log('[ChartViz] Auto-selecting first objective and score');
                setXAxis(chartData.objectivesOnly[0]);
                if (chartData.objectivesOnly.length === 1) {
                    setYAxis('score');
                } else {
                    setYAxis(chartData.objectivesOnly[1]);
                }
            } else if (!xAxis && chartData.objectivesOnly.length === 0 && chartData.constraintsOnly.length >= 1) {
                console.log('[ChartViz] No objectives found, using constraint and score');
                setXAxis(chartData.constraintsOnly[0]);
                setYAxis('score');
            } else if (!xAxis && chartData.objectiveList.length === 0) {
                console.log('[ChartViz] No objectives or constraints found, using score');
                setXAxis('score');
                setYAxis('score');
            }
        }
    }, [chartData, xAxis, yAxis]);

    return { xAxis, yAxis, setXAxis, setYAxis };
}

