'use client';

import { Box, Typography, Chip, Stack, Collapse } from '@mui/material';
import { useState } from 'react';
import { DependencyInfo, highlightExpression, ExpressionSegment } from './DependencyUtils';
import { Variable } from './VariablesTab';
import { Property } from './PropertiesTab';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

interface DependencyPanelProps {
  dependencies: DependencyInfo;
  onNavigate?: (type: 'variable' | 'property' | 'objective' | 'constraint', index: number) => void;
}

/**
 * Shows what an item uses and what uses it
 */
export function DependencyPanel({ dependencies, onNavigate }: DependencyPanelProps) {
  const [expanded, setExpanded] = useState(false);
  
  const hasUses = dependencies.uses.length > 0;
  const hasUsedBy = dependencies.usedBy.length > 0;
  
  if (!hasUses && !hasUsedBy) {
    return null;
  }
  
  return (
    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1 }}>
      <Box
        sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 0.5 }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ArrowDropDownIcon fontSize="small" /> : <ArrowRightIcon fontSize="small" />}
        <Typography variant="caption" fontWeight="bold" color="text.secondary">
          Dependencies ({dependencies.uses.length + dependencies.usedBy.length})
        </Typography>
      </Box>
      
      <Collapse in={expanded}>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {hasUses && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mb: 0.5 }}>
                Uses:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {dependencies.uses.map((name, idx) => (
                  <Chip
                    key={idx}
                    label={name}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      fontFamily: 'monospace',
                      bgcolor: 'primary.50',
                      color: 'primary.main',
                      fontWeight: 'bold',
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
          
          {hasUsedBy && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mb: 0.5 }}>
                Used by:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {dependencies.usedBy.map((item, idx) => (
                  <Chip
                    key={idx}
                    label={item.name}
                    size="small"
                    onClick={() => onNavigate?.(item.type, item.index)}
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      bgcolor: item.type === 'property' ? 'grey.200' : 
                               item.type === 'objective' ? 'success.50' : 'warning.50',
                      color: item.type === 'property' ? 'grey.700' : 
                             item.type === 'objective' ? 'success.main' : 'warning.main',
                      fontWeight: 'bold',
                      cursor: onNavigate ? 'pointer' : 'default',
                      '&:hover': onNavigate ? {
                        bgcolor: item.type === 'property' ? 'grey.300' : 
                                 item.type === 'objective' ? 'success.100' : 'warning.100',
                      } : {},
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}

interface HighlightedExpressionProps {
  expression: string;
  variables: Variable[];
  properties: Property[];
  onReferenceClick?: (type: 'variable' | 'property', name: string) => void;
}

/**
 * Displays an expression with syntax highlighting for variables and properties
 */
export function HighlightedExpression({ expression, variables, properties, onReferenceClick }: HighlightedExpressionProps) {
  const segments = highlightExpression(expression, variables, properties);
  
  return (
    <Box
      sx={{
        fontFamily: 'monospace',
        fontSize: '0.875rem',
        bgcolor: 'rgba(0,0,0,0.05)',
        p: 1,
        borderRadius: 1,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.3,
        alignItems: 'center',
      }}
    >
      {segments.map((segment, idx) => {
        if (segment.type === 'text') {
          return <span key={idx}>{segment.text}</span>;
        }
        
        const handleClick = segment.name && onReferenceClick 
          ? () => onReferenceClick(segment.type as 'variable' | 'property', segment.name!)
          : undefined;
        
        return (
          <Chip
            key={idx}
            label={segment.text}
            size="small"
            onClick={handleClick}
            sx={{
              height: 18,
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              bgcolor: segment.type === 'variable' ? 'primary.100' : 'grey.200',
              color: segment.type === 'variable' ? 'primary.dark' : 'grey.800',
              fontWeight: 'bold',
              cursor: onReferenceClick ? 'pointer' : 'default',
              '&:hover': onReferenceClick ? {
                bgcolor: segment.type === 'variable' ? 'primary.200' : 'grey.300',
              } : {},
              '& .MuiChip-label': {
                px: 0.5,
              },
            }}
          />
        );
      })}
    </Box>
  );
}
