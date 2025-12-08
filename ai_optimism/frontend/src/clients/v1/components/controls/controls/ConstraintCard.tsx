/**
 * Tile card for displaying and editing constraints
 */

import { Box, Card, Typography, Chip, IconButton, LinearProgress, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import LockIcon from '@mui/icons-material/Lock';
import TuneIcon from '@mui/icons-material/Tune';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import type { Constraint } from './types';

interface ConstraintCardProps {
  constraint: Constraint;
  currentValue?: number;
  limit?: number;
  operator?: string;
  isSatisfied?: boolean;
  dependencies: string[];
  onEdit?: () => void;
  onVariableClick?: (variableName: string) => void;
}

export function ConstraintCard({
  constraint,
  currentValue,
  limit,
  operator,
  isSatisfied = true,
  dependencies,
  onEdit,
  onVariableClick,
}: ConstraintCardProps) {
  // Calculate progress percentage for visual indicator
  // For <= and <: show how close current value is to the limit (higher = closer to violation)
  // For >= and >: show how close current value is to the limit from below (lower = closer to violation)
  const progressPercentage = limit && currentValue !== undefined && operator
    ? (() => {
        if (operator === '<=' || operator === '<') {
          // For upper bounds: show percentage of limit used
          return Math.min(100, Math.max(0, (currentValue / limit) * 100));
        } else if (operator === '>=' || operator === '>') {
          // For lower bounds: show how far above the limit we are
          // If currentValue >= limit, we're satisfied, show 100%
          // If currentValue < limit, show percentage of how close we are
          if (currentValue >= limit) {
            return 100; // Fully satisfied
          } else {
            return Math.min(100, Math.max(0, (currentValue / limit) * 100));
          }
        } else {
          // For == and !=, just show a simple percentage
          return limit !== 0 ? Math.min(100, Math.abs((currentValue / limit) * 100)) : 0;
        }
      })()
    : undefined;

  const isHard = constraint.type !== 'soft'; // Default to hard for backward compatibility
  const constraintTypeColor = isHard 
    ? (isSatisfied ? 'success.main' : 'error.main')
    : (isSatisfied ? 'success.light' : 'warning.main');
  const constraintTypeBg = isHard
    ? (isSatisfied ? 'success.50' : 'error.50')
    : (isSatisfied ? 'success.25' : 'warning.50');
  
  // Constraints are already normalized: 1.0 if satisfied, 0.0 if violated
  const normalizedValue = isSatisfied ? 1.0 : 0.0;
  // For hard constraints, use very high weight (100000), for soft use user-specified (default 10.0)
  const weight = isHard ? 100000.0 : (constraint.weight ?? 10.0);
  const contribution = normalizedValue * weight;

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
        gridColumn: 'span 6',
        gridRow: 'span 2',
        minHeight: '180px', // Dynamic height for consistent sizing
        boxSizing: 'border-box',
        border: 2,
        borderColor: constraintTypeColor,
        bgcolor: constraintTypeBg,
        '&:hover': {
          boxShadow: 4,
          '& .edit-button': {
            opacity: 1,
          },
        },
      }}
    >
      {/* Edit Button - Top Right Corner */}
      {onEdit && (
        <IconButton
          size="small"
          onClick={onEdit}
          className="edit-button"
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            opacity: 0,
            transition: 'opacity 0.2s',
            p: 0.25,
            zIndex: 1,
          }}
        >
          <EditIcon sx={{ fontSize: 14 }} />
        </IconButton>
      )}

      {/* Top: Status badges - match height with objective card */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, height: 24 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {isSatisfied ? (
            <CheckCircleIcon sx={{ fontSize: 14, color: constraintTypeColor }} />
          ) : (
            <WarningIcon sx={{ fontSize: 14, color: constraintTypeColor }} />
          )}
          <Typography
            variant="caption"
            fontWeight="bold"
            sx={{
              fontSize: '0.7rem',
              color: constraintTypeColor,
              textTransform: 'uppercase',
            }}
          >
            {isSatisfied ? 'SATISFIED' : 'VIOLATED'}
          </Typography>
          <Chip
            label={isHard ? 'HARD' : 'SOFT'}
            size="small"
            sx={{
              height: 18,
              fontSize: '0.65rem',
              bgcolor: isHard ? 'error.main' : 'warning.main',
              color: 'white',
              fontWeight: 'bold',
            }}
          />
        </Box>
      </Box>

      {/* Two Column Layout: Title/Description/Expression (left) and Scores (right) */}
      <Box sx={{ display: 'flex', gap: 1, flex: 1, minHeight: 0 }}>
        {/* Left Column: Title, Description, and Expression */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <Typography
            variant="subtitle2"
            fontWeight="bold"
            sx={{
              fontSize: '0.8rem',
              lineHeight: 1.2,
              mb: 0.25,
            }}
          >
            {constraint.title}
          </Typography>
          {constraint.description && (
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ 
                fontSize: '0.65rem', 
                display: 'block', 
                mb: 0.5,
                lineHeight: 1.3,
              }}
            >
              {constraint.description}
            </Typography>
          )}
          <Box
            sx={{
              flex: 1,
              bgcolor: 'background.paper',
              borderRadius: 1,
              px: 1,
              py: 0.4,
              overflow: 'auto',
              minHeight: 0,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', display: 'block', mb: 0.2 }}>
              Expression
            </Typography>
            <Typography
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                lineHeight: 1.4,
                wordBreak: 'break-word',
              }}
            >
              {constraint.expression}
            </Typography>
          </Box>
        </Box>

        {/* Right Column: Scores - Narrow vertical stack */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 0.2,
          minWidth: 65,
          pt: 0.2,
          pb: 0.4,
        }}>
        <Box sx={{ 
          bgcolor: 'background.paper', 
          borderRadius: 1, 
          px: 0.75, 
          py: 0.4,
          textAlign: 'center',
          width: '100%',
        }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', display: 'block', lineHeight: 1 }}>
            Normalized
          </Typography>
          <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.75rem', color: 'text.primary', lineHeight: 1 }}>
            {normalizedValue.toFixed(3)}
          </Typography>
        </Box>
        
          {/* Multiply symbol */}
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1, my: -0.1 }}>
            ×
          </Typography>
          
          <Box sx={{ 
            bgcolor: 'background.paper', 
            borderRadius: 1, 
            px: 0.75, 
            py: 0.4,
            textAlign: 'center',
            width: '100%',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.3, mb: 0.2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', lineHeight: 1 }}>
                Weight
              </Typography>
              <Tooltip 
                title={constraint.description || (isHard 
                  ? "Hard constraint weight (100000) - violations are heavily penalized" 
                  : "Soft constraint weight - violations add penalty to objective")}
              >
                <ArrowDownwardIcon sx={{ fontSize: 12, color: constraintTypeColor, cursor: 'help' }} />
              </Tooltip>
            </Box>
            <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.75rem', color: constraintTypeColor, lineHeight: 1 }}>
              {weight >= 1000 ? weight.toExponential(1) : weight.toFixed(1)}
            </Typography>
          </Box>

          {/* Divider above contribution */}
          <Box sx={{ 
            width: '100%', 
            height: '1px', 
            bgcolor: 'divider', 
            my: 0.1,
          }} />

          <Box sx={{ 
            bgcolor: 'background.paper', 
            borderRadius: 1, 
            px: 0.75, 
            py: 0.5,
            textAlign: 'center',
            width: '100%',
          }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', display: 'block', lineHeight: 1 }}>
              Contrib
            </Typography>
            <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1rem', color: constraintTypeColor, lineHeight: 1 }}>
              {contribution >= 1000 ? contribution.toExponential(2) : contribution.toFixed(3)}
            </Typography>
          </Box>
        </Box>
      </Box>

    </Card>
  );
}
