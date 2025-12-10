import { Stack, ToggleButtonGroup, ToggleButton, Chip, FormControl, InputLabel, Select, MenuItem, Box, Typography } from '@mui/material';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import type { ChartType, AxisOption } from '../types';

interface ChartControlsProps {
    chartType: ChartType;
    onChartTypeChange: (type: ChartType | null) => void;
    hasTwoVariables: boolean;
    paretoDataLength: number;
    objectivesCount: number;
    constraintsCount: number;
    showAxisSelectors: boolean;
    xAxis: string;
    yAxis: string;
    availableAxes: AxisOption[];
    onXAxisChange: (value: string) => void;
    onYAxisChange: (value: string) => void;
}

export function ChartControls({
    chartType,
    onChartTypeChange,
    hasTwoVariables,
    paretoDataLength,
    objectivesCount,
    constraintsCount,
    showAxisSelectors,
    xAxis,
    yAxis,
    availableAxes,
    onXAxisChange,
    onYAxisChange,
}: ChartControlsProps) {
    return (
        <>
            {/* Row 1: Chart Type Toggle Buttons */}
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                <ToggleButtonGroup
                    value={chartType}
                    exclusive
                    onChange={(_, newType) => onChartTypeChange(newType)}
                    size="small"
                >
                    {hasTwoVariables && (
                        <ToggleButton value="variable-space">
                            <ScatterPlotIcon sx={{ mr: 0.5, fontSize: 18 }} />
                            Variable Space
                        </ToggleButton>
                    )}
                    <ToggleButton value="pareto">
                        <ScatterPlotIcon sx={{ mr: 0.5, fontSize: 18 }} />
                        Pareto Front
                    </ToggleButton>
                    <ToggleButton value="convergence" disabled>
                        <TrendingUpIcon sx={{ mr: 0.5, fontSize: 18 }} />
                        Convergence
                    </ToggleButton>
                </ToggleButtonGroup>
            </Stack>

            {/* Row 2: Info Chips */}
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                <Chip 
                    label={`${paretoDataLength} Solution${paretoDataLength !== 1 ? 's' : ''}`} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                />
                <Chip 
                    label={`${objectivesCount} Objective${objectivesCount !== 1 ? 's' : ''}`} 
                    size="small" 
                    color="secondary" 
                    variant="outlined"
                />
                <Chip 
                    label={`${constraintsCount} Constraint${constraintsCount !== 1 ? 's' : ''}`} 
                    size="small" 
                    color="warning" 
                    variant="outlined"
                />
            </Stack>

            {/* Row 3: Axis Selectors (only for Pareto view) */}
            {showAxisSelectors && (
                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                    <FormControl size="small" sx={{ minWidth: 120, maxWidth: 200 }}>
                        <InputLabel>X Axis</InputLabel>
                        <Select
                            value={xAxis}
                            label="X Axis"
                            onChange={(e) => onXAxisChange(e.target.value)}
                        >
                            {availableAxes.map(axis => (
                                <MenuItem key={axis.value} value={axis.value}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        {axis.type === 'constraint' && <Typography variant="caption" sx={{ color: 'warning.main' }}>⚠</Typography>}
                                        {axis.type === 'objective' && <Typography variant="caption" sx={{ color: 'secondary.main' }}>●</Typography>}
                                        <Typography variant="body2">{axis.label}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 120, maxWidth: 200 }}>
                        <InputLabel>Y Axis</InputLabel>
                        <Select
                            value={yAxis}
                            label="Y Axis"
                            onChange={(e) => onYAxisChange(e.target.value)}
                        >
                            {availableAxes.map(axis => (
                                <MenuItem key={axis.value} value={axis.value}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        {axis.type === 'constraint' && <Typography variant="caption" sx={{ color: 'warning.main' }}>⚠</Typography>}
                                        {axis.type === 'objective' && <Typography variant="caption" sx={{ color: 'secondary.main' }}>●</Typography>}
                                        <Typography variant="body2">{axis.label}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
            )}
        </>
    );
}

