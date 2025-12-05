/**
 * Editor for categorical variable categories and their attributes
 */

import {
  Box,
  FormLabel,
  Stack,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  TextField,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useState, useEffect } from 'react';
import type { Variable } from './types';

// Component for numeric attribute input that allows empty state
function NumericAttributeField({ value, onValueChange }: { value: number; onValueChange: (value: number) => void }) {
  const [inputValue, setInputValue] = useState<string>(value.toString());

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  return (
    <TextField
      size="small"
      type="number"
      value={inputValue}
      onChange={(e) => {
        setInputValue(e.target.value);
      }}
      onBlur={(e) => {
        const parsed = parseFloat(e.target.value);
        if (!isNaN(parsed)) {
          onValueChange(parsed);
          setInputValue(parsed.toString());
        } else if (e.target.value === '') {
          // Empty input, set to 0
          onValueChange(0);
          setInputValue('0');
        } else {
          // Invalid input, reset to last valid value
          setInputValue(value.toString());
        }
      }}
      sx={{
        flex: 1,
        '& .MuiInputBase-input': {
          py: 0.5,
          fontSize: '0.7rem',
        },
      }}
    />
  );
}

interface VariableCategoriesEditorProps {
  variable: Variable;
  onVariableChange: (variable: Variable) => void;
}

export function VariableCategoriesEditor({
  variable,
  onVariableChange,
}: VariableCategoriesEditorProps) {
  const [newCategory, setNewCategory] = useState('');

  if (variable.type !== 'categorical') {
    return null;
  }

  const handleAddCategory = () => {
    if (newCategory.trim() && variable.categories) {
      const trimmedCategory = newCategory.trim();
      onVariableChange({
        ...variable,
        categories: [...variable.categories, trimmedCategory],
        attributes: {
          ...(variable.attributes || {}),
          [trimmedCategory]: {}, // Initialize empty attributes for new category
        },
      });
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (index: number) => {
    if (variable.categories && variable.categories.length > 2) {
      const categoryToRemove = variable.categories[index];
      const newCategories = variable.categories.filter((_, i) => i !== index);
      const newAttributes = { ...variable.attributes };
      delete newAttributes[categoryToRemove];
      
      onVariableChange({
        ...variable,
        categories: newCategories,
        attributes: newAttributes,
      });
    }
  };

  const handleAttributeChange = (category: string, attributeKey: string, value: any) => {
    onVariableChange({
      ...variable,
      attributes: {
        ...(variable.attributes || {}),
        [category]: {
          ...(variable.attributes?.[category] || {}),
          [attributeKey]: value,
        },
      },
    });
  };

  const handleAddAttribute = (category: string) => {
    const newKey = `new_attribute_${Date.now()}`;
    handleAttributeChange(category, newKey, 0);
  };

  const handleRemoveAttribute = (category: string, attributeKey: string) => {
    const categoryAttributes = { ...(variable.attributes?.[category] || {}) };
    delete categoryAttributes[attributeKey];
    
    onVariableChange({
      ...variable,
      attributes: {
        ...(variable.attributes || {}),
        [category]: categoryAttributes,
      },
    });
  };

  return (
    <Box>
      <FormLabel component="legend" sx={{ mb: 1 }}>
        Categories
      </FormLabel>
      <Stack spacing={1}>
        {variable.categories?.map((cat, idx) => {
          const categoryAttributes = variable.attributes?.[cat] || {};
          const hasAttributes = Object.keys(categoryAttributes).length > 0;

          return (
            <Box key={idx}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: hasAttributes ? 0.5 : 0 }}>
                <Chip
                  label={cat}
                  onDelete={
                    variable.categories && variable.categories.length > 2
                      ? () => handleRemoveCategory(idx)
                      : undefined
                  }
                  sx={{ flex: 1 }}
                />
              </Box>

              {/* Collapsible attributes section */}
              {(hasAttributes || true) && (
                <Accordion
                  defaultExpanded={false}
                  sx={{
                    ml: 2,
                    mt: 0.5,
                    mb: 1,
                    '&:before': { display: 'none' },
                    boxShadow: 'none',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      minHeight: 32,
                      '& .MuiAccordionSummary-content': {
                        margin: '4px 0',
                      },
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                      Attributes ({Object.keys(categoryAttributes).length})
                    </Typography>
                  </AccordionSummary>
                <AccordionDetails sx={{ pt: 1, pb: 1 }}>
                  <Stack spacing={1}>
                    {/* Editable attributes - primitives only (string, number, boolean) */}
                    {Object.entries(categoryAttributes).map(([key, value]) => {
                      const valueType = typeof value;
                      const isNumeric = valueType === 'number';
                      const isBoolean = valueType === 'boolean';
                      const isString = valueType === 'string';

                      return (
                        <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TextField
                            size="small"
                            placeholder="Attribute name"
                            value={key}
                            onChange={(e) => {
                              // Rename attribute key
                              const newKey = e.target.value;
                              if (newKey && newKey !== key) {
                                const newAttributes = { ...categoryAttributes };
                                newAttributes[newKey] = newAttributes[key];
                                delete newAttributes[key];
                                onVariableChange({
                                  ...variable,
                                  attributes: {
                                    ...(variable.attributes || {}),
                                    [cat]: newAttributes,
                                  },
                                });
                              }
                            }}
                            sx={{
                              minWidth: 120,
                              '& .MuiInputBase-input': {
                                py: 0.5,
                                fontSize: '0.7rem',
                              },
                            }}
                          />
                          {isNumeric ? (
                            <NumericAttributeField
                              value={value as number}
                              onValueChange={(newValue) => handleAttributeChange(cat, key, newValue)}
                            />
                          ) : isBoolean ? (
                            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Button
                                size="small"
                                variant={value ? 'contained' : 'outlined'}
                                onClick={() => handleAttributeChange(cat, key, true)}
                                sx={{ minWidth: 60, fontSize: '0.7rem' }}
                              >
                                True
                              </Button>
                              <Button
                                size="small"
                                variant={!value ? 'contained' : 'outlined'}
                                onClick={() => handleAttributeChange(cat, key, false)}
                                sx={{ minWidth: 60, fontSize: '0.7rem' }}
                              >
                                False
                              </Button>
                            </Box>
                          ) : (
                            <TextField
                              size="small"
                              value={String(value)}
                              onChange={(e) => {
                                // Keep as string - no JSON parsing for nested objects
                                handleAttributeChange(cat, key, e.target.value);
                              }}
                              sx={{
                                flex: 1,
                                '& .MuiInputBase-input': {
                                  py: 0.5,
                                  fontSize: '0.7rem',
                                },
                              }}
                            />
                          )}
                          <Button
                            size="small"
                            onClick={() => handleRemoveAttribute(cat, key)}
                            sx={{ minWidth: 'auto', px: 1 }}
                          >
                            ×
                          </Button>
                        </Box>
                      );
                    })}
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => handleAddAttribute(cat)}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      Add Attribute
                    </Button>
                  </Stack>
                </AccordionDetails>
              </Accordion>
              )}
            </Box>
          );
        })}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="New category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
            fullWidth
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddCategory}
          >
            Add
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

