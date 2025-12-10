'use client';

import { Box, Typography } from '@mui/material';
import { useState, useEffect } from 'react';
import { useChartData } from './hooks/useChartData';
import { useChartDimensions } from './hooks/useChartDimensions';
import { useAxisSelection } from './hooks/useAxisSelection';
import { ChartControls } from './components/ChartControls';
import { ParetoChart } from './components/ParetoChart';
import { VariableSpaceChart } from './components/VariableSpaceChart';
import type { ChartVizProps, ChartType, AxisOption } from './types';

export default function ChartViz({ data }: ChartVizProps) {
    console.log('[ChartViz] Component loaded, data:', data);
    const [chartType, setChartType] = useState<ChartType>('pareto');
    const chartData = useChartData(data);
    const { dimensions, containerRef } = useChartDimensions();
    const { xAxis, yAxis, setXAxis, setYAxis } = useAxisSelection(chartData);

    // Add CSS for legend wrapping
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .chart-legend-wrap {
                display: flex !important;
                flex-wrap: wrap !important;
                justify-content: center !important;
                gap: 8px 16px !important;
                max-width: 100% !important;
            }
            .chart-legend-wrap .recharts-legend-item {
                margin: 4px 8px !important;
            }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    if (!data) {
        return (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', p: 4 }}>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                    No optimization data available
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Run an optimization to see visualization
                </Typography>
            </Box>
        );
    }

    if (!chartData) {
        return (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', p: 4 }}>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                    No results found in data
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Data structure: {JSON.stringify(Object.keys(data || {}))}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="pre" sx={{ fontSize: '0.7rem', maxWidth: '100%', overflow: 'auto' }}>
                    {JSON.stringify(data, null, 2).substring(0, 500)}
                </Typography>
            </Box>
        );
    }

    const { paretoData, objectivesOnly, constraintsOnly, variables } = chartData;
    
    // Check if we have 2 variables for variable space view
    const hasTwoVariables = variables.length === 2;

    // Determine available axes (objectives + score + constraints, separated)
    const availableAxes: AxisOption[] = [
        { value: 'score', label: 'Score', type: 'metric' },
        ...objectivesOnly.map(obj => ({ value: obj, label: obj, type: 'objective' as const })),
        ...constraintsOnly.map(con => ({ 
            value: con, 
            label: con.replace('Violation: ', '').replace(/^Violation\(/, '').replace(/\)$/, ''), 
            type: 'constraint' as const
        })),
    ];

    const handleChartTypeChange = (type: ChartType | null) => {
        if (type !== null) {
            setChartType(type);
        }
    };

    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2, overflow: 'hidden', minHeight: 0 }}>
            <ChartControls
                chartType={chartType}
                onChartTypeChange={handleChartTypeChange}
                hasTwoVariables={hasTwoVariables}
                paretoDataLength={paretoData.length}
                objectivesCount={objectivesOnly.length}
                constraintsCount={constraintsOnly.length}
                showAxisSelectors={chartType === 'pareto'}
                xAxis={xAxis}
                yAxis={yAxis}
                availableAxes={availableAxes}
                onXAxisChange={setXAxis}
                onYAxisChange={setYAxis}
            />

            {/* Chart Area */}
            <Box sx={{ 
                flex: 1, 
                width: '100%', 
                minHeight: 500,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {chartType === 'variable-space' && hasTwoVariables ? (
                    <VariableSpaceChart 
                        chartData={chartData}
                        dimensions={dimensions}
                        containerRef={containerRef}
                    />
                ) : chartType === 'pareto' && xAxis && yAxis ? (
                    <ParetoChart 
                        chartData={chartData}
                        xAxis={xAxis}
                        yAxis={yAxis}
                        dimensions={dimensions}
                        containerRef={containerRef}
                    />
                ) : chartType === 'convergence' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Typography variant="body2" color="text.secondary">
                            Convergence data not available
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Typography variant="body2" color="text.secondary">
                            Select axes to display
                        </Typography>
                    </Box>
                )}
            </Box>

            {/* Info Footer */}
            <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">
                    {chartType === 'variable-space' && (
                        <>
                            Variable space view showing constraint boundaries (red/orange lines) and objective contours (green dashed lines).
                            Red point indicates best solution.
                        </>
                    )}
                    {chartType === 'pareto' && (
                        <>
                            Red point indicates best solution. Hover over points to see details.
                            {chartData.objectiveList.length > 2 && ' Use axis selectors to view different objective combinations.'}
                        </>
                    )}
                </Typography>
            </Box>
        </Box>
    );
}

