import { Box, Typography } from '@mui/material';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CustomTooltip } from './CustomTooltip';
import type { ChartData } from '../types';

interface ParetoChartProps {
    chartData: ChartData;
    xAxis: string;
    yAxis: string;
    dimensions: { width: number; height: number };
    containerRef: React.RefObject<HTMLDivElement | null>;
}

export function ParetoChart({ chartData, xAxis, yAxis, dimensions, containerRef }: ParetoChartProps) {
    const { paretoData } = chartData;
    
    // Validate that data exists for selected axes
    const sampleData = paretoData[0];
    const hasXData = sampleData && (sampleData[xAxis] !== undefined || sampleData[xAxis] !== null);
    const hasYData = sampleData && (sampleData[yAxis] !== undefined || sampleData[yAxis] !== null);
    
    if (!hasXData || !hasYData) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column' }}>
                <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                    Invalid axis selection
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    X: {xAxis} (exists: {hasXData ? 'yes' : 'no'}), Y: {yAxis} (exists: {hasYData ? 'yes' : 'no'})
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    Sample data keys: {sampleData ? Object.keys(sampleData).join(', ') : 'none'}
                </Typography>
            </Box>
        );
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
                <ScatterChart
                    margin={{ top: 20, right: 80, bottom: 60, left: 50 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                        type="number" 
                        dataKey={xAxis} 
                        name={xAxis}
                        label={{ value: xAxis, position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                        type="number" 
                        dataKey={yAxis} 
                        name={yAxis}
                        label={{ value: yAxis, angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                        wrapperStyle={{ 
                            paddingTop: '10px',
                            fontSize: '13px',
                            lineHeight: '20px'
                        }}
                        iconSize={14}
                        iconType="circle"
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        wrapperClass="chart-legend-wrap"
                    />
                    {/* All solutions - show all points */}
                    <Scatter 
                        name="Solutions" 
                        data={paretoData.filter(d => d.rank !== 1)} 
                        fill="#8884d8"
                        fillOpacity={0.7}
                    />
                    {/* Best solution (rank 1) - highlighted */}
                    {paretoData.find(d => d.rank === 1) && (
                        <Scatter 
                            name="Best Solution" 
                            data={[paretoData.find(d => d.rank === 1)!]} 
                            fill="#ff4444"
                            fillOpacity={1.0}
                        />
                    )}
                </ScatterChart>
            </ResponsiveContainer>
        </Box>
    );
}

