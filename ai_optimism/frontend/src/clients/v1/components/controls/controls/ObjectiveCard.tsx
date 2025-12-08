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
  currentValue?: number; // Raw normalized value (0-1)
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
  // For minimize objectives, the normalized value is already inverted (1.0 - raw), so we show effective weight
  const effectiveWeight = isMaximize ? weight : -weight;
  const weightedContribution = currentValue !== undefined ? currentValue * weight : undefined;

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

      {/* Top: MAXIMIZE badge and edit button */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
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
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 0.3,
          minWidth: 65,
          pt: 0.2,
        }}>
          {currentValue !== undefined && (
            <Box sx={{ 
              bgcolor: 'background.paper', 
              borderRadius: 1, 
              px: 0.75, 
              py: 0.4,
              textAlign: 'center',
              width: '100%',
            }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', display: 'block', lineHeight: 1 }}>
                Raw
              </Typography>
              <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.75rem', color: 'text.primary', lineHeight: 1 }}>
                {currentValue.toFixed(3)}
              </Typography>
            </Box>
          )}
          
          {/* Multiply symbol */}
          {currentValue !== undefined && (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1 }}>
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
                title={isMaximize 
                  ? "Weight for combining objectives. Higher weight = more important." 
                  : "Effective weight. For minimize objectives, the normalized value is inverted (1.0 - raw) before multiplying by this weight, so lower raw values contribute more to the score."
                }
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

          {/* Divider above contribution */}
          {currentValue !== undefined && (
            <Box sx={{ 
              width: '100%', 
              height: '1px', 
              bgcolor: 'divider', 
              my: 0.2,
            }} />
          )}

          {currentValue !== undefined && (
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
          )}
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
    (prevProps.objective.weight ?? 1.0) === (nextProps.objective.weight ?? 1.0) &&
    prevProps.currentValue === nextProps.currentValue &&
    prevProps.dependencies.length === nextProps.dependencies.length &&
    prevProps.dependencies.every((dep, i) => dep === nextProps.dependencies[i])
  );
});
