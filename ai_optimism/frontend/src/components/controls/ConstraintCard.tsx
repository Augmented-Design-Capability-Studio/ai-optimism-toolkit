/**
 * Tile card for displaying and editing constraints
 */

import { Box, Card, Typography, Chip, IconButton, LinearProgress, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
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
        boxSizing: 'border-box',
        border: 2,
        borderColor: isSatisfied ? 'success.main' : 'error.main',
        bgcolor: isSatisfied ? 'success.50' : 'error.50',
        '&:hover': {
          boxShadow: 4,
          '& .edit-button': {
            opacity: 1,
          },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.25 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
            {isSatisfied ? (
              <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
            ) : (
              <WarningIcon sx={{ fontSize: 14, color: 'error.main' }} />
            )}
            <Typography
              variant="caption"
              fontWeight="bold"
              sx={{
                fontSize: '0.7rem',
                color: isSatisfied ? 'success.dark' : 'error.dark',
              }}
            >
              {isSatisfied ? 'SATISFIED' : 'VIOLATED'}
            </Typography>
          </Box>
          {constraint.title && (
            <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', mb: 0.25 }}>
              {constraint.title}
            </Typography>
          )}
          {constraint.description && (
            <Typography variant="caption" sx={{ fontSize: '0.65rem', display: 'block', color: 'text.secondary' }}>
              {constraint.description}
            </Typography>
          )}
        </Box>
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

      {/* Expression */}
      <Box sx={{ display: 'flex', alignItems: 'center', my: 0.25 }}>
        <Typography
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.7rem',
            flex: 1,
            wordBreak: 'break-word',
            lineHeight: 1.3,
          }}
        >
          {constraint.expression}
        </Typography>
      </Box>

      {/* Value and Progress */}
      {currentValue !== undefined && limit !== undefined && typeof currentValue === 'number' && typeof limit === 'number' && (
        <Box sx={{ mb: dependencies.length > 0 ? 0.3 : 0, mt: 0.3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.15 }}>
            <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
              Current: {currentValue.toFixed(2)}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
              Limit: {operator ? `${operator}${limit.toFixed(2)}` : limit.toFixed(2)}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressPercentage || 0}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: 'grey.300',
              '& .MuiLinearProgress-bar': {
                bgcolor: isSatisfied ? 'success.main' : 'error.main',
              },
            }}
          />
        </Box>
      )}

      {/* Dependencies */}
      {dependencies.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap', mt: 'auto' }}>
          {dependencies.map((dep) => (
            <Chip
              key={dep}
              label={dep}
              size="small"
              onClick={() => onVariableClick?.(dep)}
              sx={{
                height: 18,
                fontSize: '0.65rem',
                cursor: onVariableClick ? 'pointer' : 'default',
              }}
            />
          ))}
        </Box>
      )}
    </Card>
  );
}
