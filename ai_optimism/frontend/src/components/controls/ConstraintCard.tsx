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
  isSatisfied?: boolean;
  dependencies: string[];
  onEdit?: () => void;
  onVariableClick?: (variableName: string) => void;
}

export function ConstraintCard({
  constraint,
  currentValue,
  limit,
  isSatisfied = true,
  dependencies,
  onEdit,
  onVariableClick,
}: ConstraintCardProps) {
  // Calculate progress percentage for visual indicator
  const progressPercentage = limit && currentValue !== undefined
    ? Math.min(100, (currentValue / limit) * 100)
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
        gridRow: 'span 3',
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
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {isSatisfied ? (
              <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
            ) : (
              <WarningIcon sx={{ fontSize: 16, color: 'error.main' }} />
            )}
            <Typography
              variant="caption"
              fontWeight="bold"
              sx={{
                fontSize: '0.75rem',
                color: isSatisfied ? 'success.dark' : 'error.dark',
              }}
            >
              {isSatisfied ? 'SATISFIED' : 'VIOLATED'}
            </Typography>
          </Box>
          {constraint.description && (
            <Typography variant="caption" sx={{ fontSize: '0.7rem', display: 'block', mt: 0.25 }}>
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
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', my: 0.5 }}>
        <Typography
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            flex: 1,
            wordBreak: 'break-word',
            lineHeight: 1.4,
          }}
        >
          {constraint.expression}
        </Typography>
      </Box>

      {/* Value and Progress */}
      {currentValue !== undefined && limit !== undefined && typeof currentValue === 'number' && typeof limit === 'number' && (
        <Box sx={{ mb: 0.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
            <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
              Current: {currentValue.toFixed(2)}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
              Limit: {limit.toFixed(2)}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressPercentage || 0}
            sx={{
              height: 6,
              borderRadius: 3,
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
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
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
