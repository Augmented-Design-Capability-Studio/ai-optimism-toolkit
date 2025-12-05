/**
 * Tile card for displaying and editing objectives
 */

import { Box, Card, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import { useMemo, memo } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import type { Objective } from './types';

interface ObjectiveCardProps {
  objective: Objective;
  currentValue?: number;
  dependencies: string[];
  onEdit?: () => void;
  onVariableClick?: (variableName: string) => void;
}

// Parse expression to identify variable names for clickable chips
// Moved outside component to avoid recreating on every render
const parseExpression = (expr: string): (string | { type: 'variable'; name: string })[] => {
  const tokens: (string | { type: 'variable'; name: string })[] = [];
  const variablePattern = /[a-zA-Z_][a-zA-Z0-9_]*/g;
  let lastIndex = 0;
  let match;

  while ((match = variablePattern.exec(expr)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(expr.slice(lastIndex, match.index));
    }
    tokens.push({ type: 'variable', name: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < expr.length) {
    tokens.push(expr.slice(lastIndex));
  }

  return tokens;
};

export const ObjectiveCard = memo(function ObjectiveCard({
  objective,
  currentValue,
  dependencies,
  onEdit,
  onVariableClick,
}: ObjectiveCardProps) {
  const isMaximize = objective.goal === 'maximize';

  // Memoize expression parsing and dependency set for O(1) lookups
  const expressionTokens = useMemo(() => parseExpression(objective.expression), [objective.expression]);
  const dependenciesSet = useMemo(() => new Set(dependencies), [dependencies]);

  return (
    <Card
      sx={{
        p: 1,
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
        borderColor: isMaximize ? 'success.main' : 'info.main',
        bgcolor: isMaximize ? 'success.50' : 'info.50',
        '&:hover': {
          boxShadow: 4,
          '& .edit-button': {
            opacity: 1,
          },
        },
      }}
    >
      {/* Header with Current Value aligned */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1, mb: 0.25 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.2 }}>
            {isMaximize ? (
              <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
            ) : (
              <TrendingDownIcon sx={{ fontSize: 14, color: 'info.main' }} />
            )}
            <Typography
              variant="caption"
              fontWeight="bold"
              sx={{
                fontSize: '0.7rem',
                color: isMaximize ? 'success.dark' : 'info.dark',
                textTransform: 'uppercase',
              }}
            >
              {objective.goal}
            </Typography>
          </Box>
          <Typography
            variant="subtitle2"
            fontWeight="bold"
            sx={{
              fontSize: '0.8rem',
              lineHeight: 1.2,
            }}
          >
            {objective.name}
          </Typography>
          {objective.description && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block', mt: 0.15 }}>
              {objective.description}
            </Typography>
          )}
        </Box>
        
        {/* Current Value and Edit - Aligned from bottom */}
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5 }}>
          {currentValue !== undefined && (
            <Box sx={{ 
              bgcolor: 'background.paper', 
              borderRadius: 1, 
              px: 0.75, 
              py: 0.4,
              textAlign: 'center',
              minWidth: 65,
            }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', display: 'block', lineHeight: 1 }}>
                Current
              </Typography>
              <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '0.95rem', color: isMaximize ? 'success.dark' : 'info.dark', lineHeight: 1 }}>
                {currentValue.toFixed(2)}
              </Typography>
            </Box>
          )}
          {onEdit && (
            <IconButton
              size="small"
              onClick={onEdit}
              className="edit-button"
              sx={{
                opacity: 0,
                transition: 'opacity 0.2s',
                p: 0.25,
                mb: 0.2,
              }}
            >
              <EditIcon sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Formula - Full Width */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 1,
          px: 1,
          py: 0.4,
          overflow: 'auto',
          minHeight: 0,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', display: 'block', mb: 0.2 }}>
          Formula
        </Typography>
        <Box
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            lineHeight: 1.4,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.25,
            alignItems: 'center',
          }}
        >
          {expressionTokens.map((token, idx) => {
            if (typeof token === 'string') {
              return <span key={idx}>{token}</span>;
            }
            const isVariable = dependenciesSet.has(token.name);
            return (
              <Chip
                key={idx}
                label={token.name}
                size="small"
                onClick={() => onVariableClick?.(token.name)}
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  bgcolor: isVariable ? 'primary.main' : 'secondary.main',
                  color: 'white',
                  cursor: onVariableClick ? 'pointer' : 'default',
                  '&:hover': onVariableClick ? {
                    bgcolor: isVariable ? 'primary.dark' : 'secondary.dark',
                  } : {},
                }}
              />
            );
          })}
        </Box>
      </Box>

      {/* Dependencies - removed since they're now shown inline in formula */}
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if props actually changed
  return (
    prevProps.objective.name === nextProps.objective.name &&
    prevProps.objective.expression === nextProps.objective.expression &&
    prevProps.objective.goal === nextProps.objective.goal &&
    prevProps.objective.description === nextProps.objective.description &&
    prevProps.currentValue === nextProps.currentValue &&
    prevProps.dependencies.length === nextProps.dependencies.length &&
    prevProps.dependencies.every((dep, i) => dep === nextProps.dependencies[i])
  );
});
