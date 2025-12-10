import { Box } from '@mui/material';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line } from 'recharts';
import { CustomTooltip } from './CustomTooltip';
import { parseLinearConstraint, generateConstraintLine } from '../utils/constraintParsing';
import type { ChartData } from '../types';

interface VariableSpaceChartProps {
    chartData: ChartData;
    dimensions: { width: number; height: number };
    containerRef: React.RefObject<HTMLDivElement | null>;
}

export function VariableSpaceChart({ chartData, dimensions, containerRef }: VariableSpaceChartProps) {
    const { paretoData, variables, constraints, objectives } = chartData;
    
    const var1 = variables[0]?.name;
    const var2 = variables[1]?.name;
    
    if (!var1 || !var2) {
        return null;
    }
    
    // Get variable ranges
    const var1Min = variables[0]?.min ?? 0;
    const var1Max = variables[0]?.max ?? 50;
    const var2Min = variables[1]?.min ?? 0;
    const var2Max = variables[1]?.max ?? 50;
    
    // Prepare solution data
    const solutionData = paretoData.map(d => ({
        x: typeof d.variables[var1] === 'number' ? d.variables[var1] : 0,
        y: typeof d.variables[var2] === 'number' ? d.variables[var2] : 0,
        rank: d.rank,
        score: d.score,
        variables: d.variables,
        objectives: d.objectives,
    }));
    
    // Parse constraints and generate lines
    const constraintLines: Array<{ points: Array<{ x: number; y: number }>; label: string; type: string }> = [];
    constraints.forEach((constraint: any) => {
        const parsed = parseLinearConstraint(constraint.expression, var1, var2);
        if (parsed) {
            const points = generateConstraintLine(parsed.a, parsed.b, parsed.c, var1Min, var1Max, var2Min, var2Max);
            if (points.length > 0) {
                constraintLines.push({
                    points,
                    label: constraint.title || constraint.description || 'Constraint',
                    type: constraint.type || 'hard',
                });
            }
        }
    });
    
    // Generate objective contour lines (iso-profit lines)
    const objectiveContours: Array<{ points: Array<{ x: number; y: number }>; value: number }> = [];
    if (objectives.length > 0 && objectives[0]?.expression) {
        const objExpr = objectives[0].expression;
        const parsed = parseLinearConstraint(objExpr.replace('maximize', '').replace('minimize', '').trim() + ' = 0', var1, var2);
        if (parsed) {
            const minProfit = Math.min(...solutionData.map(d => d.score));
            const maxProfit = Math.max(...solutionData.map(d => d.score));
            const numContours = 5;
            for (let i = 0; i <= numContours; i++) {
                const profit = minProfit + (maxProfit - minProfit) * (i / numContours);
                const points = generateConstraintLine(parsed.a, parsed.b, profit, var1Min, var1Max, var2Min, var2Max);
                if (points.length > 0) {
                    objectiveContours.push({ points, value: profit });
                }
            }
        }
    }
    
    // Ensure we have valid dimensions
    const chartWidth = dimensions.width > 0 ? dimensions.width : 800;
    const chartHeight = dimensions.height > 0 ? dimensions.height : 500;

    return (
        <Box 
            ref={containerRef}
            sx={{ 
                width: '100%', 
                height: '100%',
                flex: 1, 
                minHeight: 500,
                position: 'relative',
                display: 'flex',
                overflow: 'hidden'
            }}
        >
            <ResponsiveContainer 
                width={chartWidth} 
                height={chartHeight}
            >
                {/* Calculate bottom margin based on number of legend items */}
                {(() => {
                    const totalLegendItems = constraintLines.length + objectiveContours.length + 2; // +2 for Solutions and Best Solution
                    const estimatedRows = Math.ceil(totalLegendItems / 4); // Assume ~4 items per row
                    const bottomMargin = Math.max(50, estimatedRows * 25 + 20); // 25px per row + padding
                    
                    return (
                        <ScatterChart
                            margin={{ top: 20, right: 100, bottom: bottomMargin, left: 50 }}
                        >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                        type="number" 
                        dataKey="x" 
                        name={var1}
                        domain={[var1Min, var1Max]}
                        label={{ value: var1, position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                        type="number" 
                        dataKey="y" 
                        name={var2}
                        domain={[var2Min, var2Max]}
                        label={{ value: var2, angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                        wrapperStyle={{ 
                            paddingTop: '10px', 
                            fontSize: '13px',
                            lineHeight: '20px'
                        }}
                        iconSize={12}
                        iconType="line"
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        className="chart-legend-wrap"
                        formatter={(value) => {
                            // Truncate long legend labels only if very long
                            if (value.length > 25) {
                                return value.substring(0, 22) + '...';
                            }
                            return value;
                        }}
                    />
                    
                    {/* Objective contour lines */}
                    {objectiveContours.map((contour, idx) => (
                        <Line
                            key={`contour-${idx}`}
                            type="monotone"
                            dataKey="y"
                            data={contour.points}
                            stroke="#90EE90"
                            strokeWidth={1}
                            strokeDasharray="2 2"
                            dot={false}
                            name={`Profit ≈ ${contour.value.toFixed(0)}`}
                            connectNulls
                        />
                    ))}
                    
                    {/* Constraint lines */}
                    {constraintLines.map((line, idx) => (
                        <Line
                            key={`constraint-${idx}`}
                            type="linear"
                            dataKey="y"
                            data={line.points}
                            stroke={line.type === 'hard' ? "#FF6B6B" : "#FFA500"}
                            strokeWidth={2}
                            dot={false}
                            name={line.label}
                            connectNulls
                        />
                    ))}
                    
                    {/* All solutions */}
                    <Scatter 
                        name="Solutions" 
                        data={solutionData.filter(d => d.rank !== 1)} 
                        fill="#8884d8"
                        fillOpacity={0.7}
                    />
                    {/* Best solution */}
                    {solutionData.find(d => d.rank === 1) && (
                        <Scatter 
                            name="Best Solution" 
                            data={[solutionData.find(d => d.rank === 1)!]} 
                            fill="#ff4444"
                            fillOpacity={1.0}
                        />
                    )}
                        </ScatterChart>
                    );
                })()}
            </ResponsiveContainer>
        </Box>
    );
}

