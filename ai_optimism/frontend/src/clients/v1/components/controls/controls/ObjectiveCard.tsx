/**
 * Tile card for displaying and editing objectives
 */

import { Box, Card, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import { useMemo, memo } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import type { Objective } from './types';

interface ObjectiveCardProps {
  objective: Objective;
  currentValue?: number; // Raw value from expression evaluation (not normalized)
  dependencies: string[];
  onEdit?: () => void;
  onVariableClick?: (variableName: string) => void;
}

// Python reserved keywords and built-in functions to exclude from variable highlighting
const RESERVED_WORDS = new Set([
  // Python keywords
  'if', 'else', 'elif', 'for', 'while', 'def', 'class', 'import', 'from', 'as',
  'return', 'break', 'continue', 'pass', 'try', 'except', 'finally', 'raise',
  'with', 'lambda', 'yield', 'global', 'nonlocal', 'assert', 'del', 'in', 'is',
  'not', 'and', 'or', 'True', 'False', 'None',
  // Built-in functions
  'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'bytearray', 'bytes', 'callable',
  'chr', 'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir', 'divmod',
  'enumerate', 'eval', 'exec', 'filter', 'float', 'format', 'frozenset', 'getattr',
  'globals', 'hasattr', 'hash', 'help', 'hex', 'id', 'input', 'int', 'isinstance',
  'issubclass', 'iter', 'len', 'list', 'locals', 'map', 'max', 'memoryview', 'min',
  'next', 'object', 'oct', 'open', 'ord', 'pow', 'print', 'property', 'range',
  'repr', 'reversed', 'round', 'set', 'setattr', 'slice', 'sorted', 'staticmethod',
  'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip', '__import__',
  // Common math functions (if used in expressions)
  'math', 'sqrt', 'sin', 'cos', 'tan', 'log', 'exp', 'pi', 'e',
]);

// Parse expression to identify variable names for clickable chips
// Moved outside component to avoid recreating on every render
// Excludes Python keywords and built-in functions
const parseExpression = (expr: string): (string | { type: 'variable'; name: string })[] => {
  const tokens: (string | { type: 'variable'; name: string })[] = [];
  const variablePattern = /[a-zA-Z_][a-zA-Z0-9_]*/g;
  let lastIndex = 0;
  let match;

  while ((match = variablePattern.exec(expr)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(expr.slice(lastIndex, match.index));
    }
    const name = match[0];
    // Only treat as variable if it's not a reserved word
    if (RESERVED_WORDS.has(name)) {
      tokens.push(name); // Add as plain text, not a chip
    } else {
      tokens.push({ type: 'variable', name });
    }
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
  const weight = objective.weight ?? 1.0;
  
  // Normalize the raw value using bounds
  const normalizedValue = useMemo(() => {
    // Check if currentValue is a valid number (not undefined, null, or NaN)
    if (currentValue === undefined || currentValue === null || isNaN(currentValue as number)) {
      return undefined;
    }
    
    // Check if bounds are valid numbers
    if (objective.min === undefined || objective.min === null || isNaN(objective.min) ||
        objective.max === undefined || objective.max === null || isNaN(objective.max)) {
      return undefined;
    }
    
    const { min, max } = objective;
    if (max <= min) {
      return 0.5; // Default if bounds are invalid
    }
    
    // Min-max normalize to 0-1
    const currentNum = currentValue as number;
    let normalized = (currentNum - min) / (max - min);
    
    // If this is a minimize objective, invert so smaller is better
    if (!isMaximize) {
      normalized = 1.0 - normalized;
    }
    
    // Clamp to 0-1
    return Math.max(0.0, Math.min(1.0, normalized));
  }, [currentValue, objective.min, objective.max, isMaximize, objective.name]);
  
  // For minimize objectives, the normalized value is already inverted (1.0 - raw), so we show effective weight
  const effectiveWeight = isMaximize ? weight : -weight;
  // Contribution uses normalized value (0-1) multiplied by weight
  const weightedContribution = normalizedValue !== undefined ? normalizedValue * weight : undefined;

  // Memoize expression parsing and dependency set for O(1) lookups
  const expressionTokens = useMemo(() => parseExpression(objective.expression), [objective.expression]);
  const dependenciesSet = useMemo(() => new Set(dependencies), [dependencies]);

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
        minHeight: '200px', // Dynamic height to accommodate "Raw" row
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

      {/* Top: MAXIMIZE badge and edit button - match height with constraint card */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, height: 24 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
      </Box>

      {/* Two Column Layout: Title/Description/Formula (left) and Scores (right) */}
      <Box sx={{ display: 'flex', gap: 1, flex: 1, minHeight: 0 }}>
        {/* Left Column: Title, Description, and Formula */}
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
            {objective.name}
          </Typography>
          {objective.description && (
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
              {objective.description}
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
              maxHeight: '55px', // Constrain height to match constraint expression container
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
        </Box>

        {/* Right Column: Scores - Narrow vertical stack */}
        {/* Note: Objective cards have extra "Raw" row, so we need more bottom padding */}
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
          {normalizedValue !== undefined ? (
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
              {currentValue !== undefined && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block', lineHeight: 1, mt: 0.1 }}>
                  (Raw: {currentValue.toFixed(2)})
                </Typography>
              )}
            </Box>
          ) : currentValue !== undefined && (objective.min === undefined || objective.max === undefined) ? (
            <Tooltip title="Normalization range will be displayed after optimization run">
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
                <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1 }}>
                  N/A
                </Typography>
                {currentValue !== undefined && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block', lineHeight: 1, mt: 0.1 }}>
                    (Raw: {currentValue.toFixed(2)})
                  </Typography>
                )}
              </Box>
            </Tooltip>
          ) : null}
          
          {/* Multiply symbol - show when we have normalized or N/A */}
          {(normalizedValue !== undefined || (currentValue !== undefined && (objective.min === undefined || objective.max === undefined))) && (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1, my: -0.1 }}>
              ×
            </Typography>
          )}
          
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
                title={objective.description || (isMaximize 
                  ? "Weight for combining objectives. Higher weight = more important." 
                  : "Effective weight. For minimize objectives, the normalized value is inverted (1.0 - raw) before multiplying by this weight, so lower raw values contribute more to the score.")}
              >
                {isMaximize ? (
                  <ArrowUpwardIcon sx={{ fontSize: 12, color: 'success.main', cursor: 'help' }} />
                ) : (
                  <ArrowDownwardIcon sx={{ fontSize: 12, color: 'info.main', cursor: 'help' }} />
                )}
              </Tooltip>
            </Box>
            <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.75rem', color: isMaximize ? 'primary.main' : 'info.main', lineHeight: 1 }}>
              {effectiveWeight > 0 ? '+' : ''}{effectiveWeight.toFixed(1)}
            </Typography>
          </Box>

          {/* Divider above contribution - always show when contribution section exists */}
          <Box sx={{ 
            width: '100%', 
            height: '1px', 
            bgcolor: 'divider', 
            my: 0.1,
          }} />

          {normalizedValue !== undefined ? (
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
              <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1rem', color: isMaximize ? 'success.dark' : 'info.dark', lineHeight: 1 }}>
                {weightedContribution !== undefined ? weightedContribution.toFixed(3) : '—'}
              </Typography>
            </Box>
          ) : currentValue !== undefined && (objective.min === undefined || objective.max === undefined) ? (
            <Tooltip title="Contribution will be displayed after optimization run (requires normalized value)">
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
                <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1rem', color: 'text.secondary', lineHeight: 1 }}>
                  N/A
                </Typography>
              </Box>
            </Tooltip>
          ) : null}
        </Box>
      </Box>

      {/* Dependencies - removed since they're now shown inline in formula */}
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if props actually changed
  // IMPORTANT: Include min/max bounds in comparison so component re-renders when bounds are added
  return (
    prevProps.objective.name === nextProps.objective.name &&
    prevProps.objective.expression === nextProps.objective.expression &&
    prevProps.objective.goal === nextProps.objective.goal &&
    prevProps.objective.description === nextProps.objective.description &&
    (prevProps.objective.weight ?? 1.0) === (nextProps.objective.weight ?? 1.0) &&
    prevProps.objective.min === nextProps.objective.min && // Check min bound
    prevProps.objective.max === nextProps.objective.max && // Check max bound
    prevProps.currentValue === nextProps.currentValue &&
    prevProps.dependencies.length === nextProps.dependencies.length &&
    prevProps.dependencies.every((dep, i) => dep === nextProps.dependencies[i])
  );
});
