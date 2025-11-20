/**
 * Tile card for displaying and editing properties
 */

import { Box, Card, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import FunctionsIcon from '@mui/icons-material/Functions';
import type { Property } from './types';

interface PropertyCardProps {
  property: Property;
  currentValue?: number;
  dependencies: string[];
  usedByCount: number;
  onEdit?: () => void;
  onVariableClick?: (variableName: string) => void;
}

export function PropertyCard({
  property,
  currentValue,
  dependencies,
  usedByCount,
  onEdit,
  onVariableClick,
}: PropertyCardProps) {
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
        bgcolor: 'grey.50',
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
            <FunctionsIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography
              variant="caption"
              fontWeight="bold"
              sx={{
                fontSize: '0.7rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {property.name}
            </Typography>
            {usedByCount > 0 && (
              <Chip
                label={`Used by ${usedByCount}`}
                size="small"
                sx={{
                  height: 16,
                  fontSize: '0.6rem',
                  bgcolor: 'primary.main',
                  color: 'white',
                }}
              />
            )}
          </Box>
          {property.description && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', display: 'block', mt: 0.25 }}>
              {property.description}
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
            <EditIcon sx={{ fontSize: 12 }} />
          </IconButton>
        )}
      </Box>

      {/* Expression and Value */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
        <Typography
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.7rem',
            color: 'text.secondary',
            wordBreak: 'break-word',
            lineHeight: 1.4,
          }}
        >
          {property.expression}
        </Typography>
        {currentValue !== undefined && (
          <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.75rem', color: 'primary.main' }}>
            = {currentValue.toFixed(2)}
          </Typography>
        )}
      </Box>

      {/* Dependencies */}
      {dependencies.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.3, flexWrap: 'wrap', mt: 0.5 }}>
          {dependencies.map((dep) => (
            <Chip
              key={dep}
              label={dep}
              size="small"
              onClick={() => onVariableClick?.(dep)}
              sx={{
                height: 16,
                fontSize: '0.6rem',
                cursor: onVariableClick ? 'pointer' : 'default',
              }}
            />
          ))}
        </Box>
      )}
    </Card>
  );
}
