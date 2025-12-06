/**
 * Compact variable widget with interactive controls (knobs, sliders, toggles, dropdowns)
 */

import { Box, Card, Typography, Slider, ToggleButton, ToggleButtonGroup, Tooltip, IconButton, Select, MenuItem, FormControl } from '@mui/material';
import { useState, useRef, useEffect } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import type { Variable } from './types';

interface VariableWidgetProps {
  variable: Variable;
  value: number;
  onChange: (value: number) => void;
  onEdit?: () => void;
}

const UNIT_SIZE = 70; // Base tile size (70px)

export function VariableWidget({ variable, value, onChange, onEdit }: VariableWidgetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);

  // Calculate category metrics once
  const categoryMetrics = variable.categories ? {
    count: variable.categories.length,
    maxLength: Math.max(...variable.categories.map(cat => cat.length)),
    avgLength: variable.categories.reduce((sum, cat) => sum + cat.length, 0) / variable.categories.length,
  } : null;

  // Determine widget type
  const getWidgetType = (): 'knob' | 'slider' | 'stepper' | 'toggle' | 'dropdown' => {
    if (variable.type === 'categorical' && categoryMetrics) {
      // Dropdown for many categories or very long names
      if (categoryMetrics.count > 5 || categoryMetrics.avgLength > 15) return 'dropdown';
      return 'toggle';
    }
    if (variable.type === 'discrete') {
      const range = (variable.max ?? 10) - (variable.min ?? 0);
      return range <= 8 ? 'stepper' : 'slider';
    }
    // Continuous
    const range = (variable.max ?? 100) - (variable.min ?? 0);
    return range <= 100 ? 'knob' : 'slider';
  };

  const widgetType = getWidgetType();

  // Determine if toggle should be vertical
  const isVerticalToggle = widgetType === 'toggle' && categoryMetrics && 
    (categoryMetrics.count > 4 || (categoryMetrics.avgLength > 8 && categoryMetrics.count > 2));

  // Calculate grid dimensions (width and height in units)
  const getGridDimensions = (): { cols: number; rows: number } => {
    if (widgetType === 'knob') return { cols: 2, rows: 2 };
    if (widgetType === 'slider') return { cols: 4, rows: 1 };
    if (widgetType === 'stepper' || widgetType === 'dropdown') return { cols: 2, rows: 1 };
    
    if (widgetType === 'toggle' && categoryMetrics) {
      if (isVerticalToggle) {
        // Width based on text length
        const cols = categoryMetrics.maxLength > 20 ? 4 : categoryMetrics.maxLength > 12 ? 3 : 2;
        // Height based on count
        const rows = categoryMetrics.count <= 3 ? 2 : categoryMetrics.count <= 5 ? 3 : 4;
        return { cols, rows };
      }
      // Horizontal toggles
      return { cols: 4, rows: 1 };
    }
    
    return { cols: 2, rows: 1 };
  };

  const { cols: gridColSpan, rows: gridRowSpan } = getGridDimensions();

  // Format value for display
  const formatValue = (val: number): string => {
    return variable.type === 'discrete' ? Math.round(val).toString() : val.toFixed(1);
  };

  // Knob control (circular progress indicator with Material UI style)
  const renderKnob = () => {
    const min = variable.min ?? 0;
    const max = variable.max ?? 100;
    const percentage = ((value - min) / (max - min)) * 100;

    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    useEffect(() => {
      if (!isDragging) return;

      const handleMouseMove = (e: MouseEvent) => {
        if (!knobRef.current) return;
        
        const rect = knobRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        let degrees = (angle * 180) / Math.PI + 90;
        if (degrees < 0) degrees += 360;
        
        // Map angle to value (135° to 405° = 270° range)
        const startAngle = 135;
        const adjustedAngle = degrees < 135 ? degrees + 360 : degrees;
        const normalizedAngle = Math.max(135, Math.min(405, adjustedAngle));
        const ratio = (normalizedAngle - startAngle) / 270;
        
        const vMin = variable.min ?? 0;
        const vMax = variable.max ?? 100;
        const newValue = vMin + ratio * (vMax - vMin);
        const clampedValue = Math.max(vMin, Math.min(vMax, newValue));
        onChange(variable.type === 'discrete' ? Math.round(clampedValue) : clampedValue);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isDragging, variable.min, variable.max, variable.type, onChange]);

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', my: 0, px: 0.5 }}>
        {/* Min label */}
        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', minWidth: '20px', textAlign: 'right', mr: 0.5 }}>
          {formatValue(min)}
        </Typography>
        
        {/* Knob */}
        <Box
          ref={knobRef}
          onMouseDown={handleMouseDown}
          sx={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            position: 'relative',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {/* Background circle */}
          <svg width="60" height="60" style={{ position: 'absolute' }}>
            <circle
              cx="30"
              cy="30"
              r="26"
              fill="none"
              stroke="rgba(0, 0, 0, 0.1)"
              strokeWidth="4"
            />
            {/* Progress arc */}
            <circle
              cx="30"
              cy="30"
              r="26"
              fill="none"
              stroke="#1976d2"
              strokeWidth="4"
              strokeDasharray={`${(percentage / 100) * 163.4} 163.4`}
              strokeLinecap="round"
              transform="rotate(-90 30 30)"
              style={{ transition: isDragging ? 'none' : 'stroke-dasharray 0.2s' }}
            />
          </svg>
          
          {/* Center value display */}
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              bgcolor: 'background.paper',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 1,
            }}
          >
            <Typography variant="caption" fontWeight="bold" color="primary" sx={{ fontSize: '0.75rem' }}>
              {variable.type === 'categorical' && variable.categories
                ? variable.categories[Math.round(value)] || value
                : formatValue(value)}
            </Typography>
          </Box>
        </Box>
        
        {/* Max label */}
        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', minWidth: '20px', ml: 0.5 }}>
          {formatValue(max)}
        </Typography>
      </Box>
    );
  };

  // Slider control
  const renderSlider = () => {
    const min = variable.min ?? 0;
    const max = variable.max ?? 100;
    const isDiscrete = variable.type === 'discrete';
    
    return (
      <Box sx={{ px: 1.5, my: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', minWidth: 30 }}>
          {variable.type === 'categorical' && variable.categories
            ? variable.categories[Math.round(value)] || value
            : formatValue(value)}
        </Typography>
        <Slider
          value={value}
          min={min}
          max={max}
          step={isDiscrete ? 1 : 0.1}
          marks={isDiscrete && (max - min) <= 20 ? true : false}
          onChange={(_, newValue) => onChange(newValue as number)}
          valueLabelDisplay="auto"
          sx={{
            flex: 1,
            height: 8,
            '& .MuiSlider-track': {
              height: 8,
              borderRadius: 4,
              backgroundColor: '#1976d2',
              border: 'none',
            },
            '& .MuiSlider-rail': {
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              opacity: 1,
            },
            '& .MuiSlider-thumb': {
              width: 20,
              height: 20,
              backgroundColor: '#fff',
              border: '2px solid #1976d2',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              '&:hover': {
                boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
              },
              '&.Mui-active': {
                boxShadow: '0 3px 8px rgba(25,118,210,0.4)',
              },
            },
            '& .MuiSlider-mark': {
              width: 2,
              height: 8,
              backgroundColor: isDiscrete ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
              borderRadius: 1,
            },
            '& .MuiSlider-markActive': {
              backgroundColor: isDiscrete ? '#fff' : 'transparent',
              opacity: 0.8,
            },
          }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', minWidth: 30, textAlign: 'right' }}>
          {max}
        </Typography>
      </Box>
    );
  };

  // Stepper control (for discrete with small range)
  const renderStepper = () => {
    const min = variable.min ?? 0;
    const max = variable.max ?? 10;
    const steps = [];
    for (let i = min; i <= max; i++) {
      steps.push(i);
    }

    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, justifyContent: 'center', my: 0.5 }}>
        {steps.map((step) => (
          <Box
            key={step}
            onClick={() => onChange(step)}
            sx={{
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 1,
              borderColor: value === step ? 'primary.main' : 'grey.400',
              bgcolor: value === step ? 'primary.main' : 'transparent',
              color: value === step ? 'white' : 'text.primary',
              borderRadius: 0.5,
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontWeight: value === step ? 'bold' : 'normal',
              '&:hover': {
                bgcolor: value === step ? 'primary.dark' : 'grey.100',
              },
            }}
          >
            {step}
          </Box>
        ))}
      </Box>
    );
  };

  // Toggle control (for categorical)
  const renderToggle = () => {
    if (!variable.categories) return null;

    return (
      <Box sx={{ my: 0.5 }}>
        <ToggleButtonGroup
          value={Math.round(value)}
          exclusive
          onChange={(_, newValue) => newValue !== null && onChange(newValue)}
          size="small"
          fullWidth
          orientation={isVerticalToggle ? 'vertical' : 'horizontal'}
          sx={{
            '& .MuiToggleButton-root': {
              minWidth: isVerticalToggle ? 'auto' : '30px',
            },
          }}
        >
          {variable.categories.map((cat: string, idx: number) => (
            <ToggleButton
              key={idx}
              value={idx}
              sx={{
                py: 0.5,
                px: isVerticalToggle ? 1 : 0.5,
                fontSize: '0.75rem',
                textTransform: 'none',
                lineHeight: 1.3,
              }}
            >
              {cat}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
    );
  };

  // Dropdown control (for categorical with many options)
  const renderDropdown = () => {
    if (!variable.categories) return null;

    return (
      <Box sx={{ my: 0.5, px: 0.5 }}>
        <FormControl fullWidth size="small">
          <Select
            value={Math.round(value)}
            onChange={(e) => onChange(e.target.value as number)}
            sx={{
              fontSize: '0.75rem',
              '& .MuiSelect-select': {
                py: 0.5,
              },
            }}
          >
            {variable.categories.map((cat: string, idx: number) => (
              <MenuItem key={idx} value={idx} sx={{ fontSize: '0.75rem' }}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    );
  };

  return (
    <Card
      sx={{
        p: 0.75,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'all 0.2s',
        gridColumn: `span ${gridColSpan}`,
        gridRow: `span ${gridRowSpan}`,
        boxSizing: 'border-box',
        '&:hover': {
          boxShadow: 4,
          '& .edit-button': {
            opacity: 1,
          },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.5 }}>
        <Tooltip title={variable.description} arrow>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              fontWeight="bold"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                lineHeight: 1.1,
                fontSize: '0.7rem',
              }}
            >
              {variable.name}
            </Typography>
            {variable.unit && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  color: 'text.secondary',
                  fontSize: '0.65rem',
                  lineHeight: 1,
                  mt: 0.25,
                }}
              >
                {variable.unit}
              </Typography>
            )}
          </Box>
        </Tooltip>
        {onEdit && (
          <IconButton
            size="small"
            onClick={onEdit}
            className="edit-button"
            sx={{
              opacity: 0,
              transition: 'opacity 0.2s',
              ml: 0.5,
              p: 0.25,
            }}
          >
            <EditIcon sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Box>

      {/* Widget */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
        {widgetType === 'knob' && renderKnob()}
        {widgetType === 'slider' && renderSlider()}
        {widgetType === 'stepper' && renderStepper()}
        {widgetType === 'toggle' && renderToggle()}
        {widgetType === 'dropdown' && renderDropdown()}
      </Box>
    </Card>
  );
}
