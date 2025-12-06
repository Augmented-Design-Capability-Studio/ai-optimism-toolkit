/**
 * Utilities for extracting attribute information for categorical variables
 * Note: "Attributes" are properties of categorical choices (e.g., cost, prep_time for each dish)
 * These are distinct from "Properties" which are derived/computed values from variables
 */

import type { Controls, Variable, Property } from '../types';

/**
 * Check if an expression references both a property and a variable
 * e.g., dish_attributes[variable_name]['attribute'] or property_name[variable_name]
 */
function expressionUsesPropertyAndVariable(expression: string, propertyName: string, variableName: string): boolean {
  // Look for patterns like: property_name[variable_name] or property_name[variable_name]['key']
  // The property name should appear before the variable in a subscript
  const pattern = new RegExp(
    `${propertyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\[\\s*${variableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\]`,
    'g'
  );
  return pattern.test(expression);
}

/**
 * Extract property that contains a dictionary mapping categories to their attributes
 * Returns the property if it's used with this variable in objectives/constraints
 * Note: The dictionary property contains "attributes" (properties of each categorical choice)
 */
export function getPropertyForCategoricalVariable(
  variable: Variable,
  controls: Controls | null
): Property | null {
  if (!controls?.properties || variable.type !== 'categorical') {
    return null;
  }

  // Check all objectives and constraints to find properties used with this variable
  const allExpressions = [
    ...(controls.objectives?.map(obj => obj.expression) || []),
    ...(controls.constraints?.map(con => con.expression) || []),
  ];

  // Find properties that are used with this variable in expressions
  for (const property of controls.properties) {
    // Check if any expression uses both this property and the variable
    const isUsed = allExpressions.some(expr =>
      expressionUsesPropertyAndVariable(expr, property.name, variable.name)
    );

    if (isUsed) {
      // Check if the property expression is a dictionary literal
      // e.g., {'Category1': {'attribute1': value1, ...}, 'Category2': {...}}
      // This dictionary contains the "attributes" for each category
      try {
        // Try to parse as JSON to see if it's a dictionary
        const parsed = JSON.parse(property.expression);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          return property;
        }
      } catch {
        // Not JSON, but might still be a dictionary property
        // Check if expression looks like a dictionary literal
        if (property.expression.trim().startsWith('{') && property.expression.trim().endsWith('}')) {
          return property;
        }
      }
    }
  }

  return null;
}

/**
 * Extract attribute values for each category of a categorical variable
 * Returns a map of category -> attributes (the properties of each categorical choice)
 */
export function getCategoryPropertyValues(
  variable: Variable,
  property: Property,
  controls: Controls | null
): Record<string, Record<string, any>> | null {
  if (!variable.categories || !controls) {
    return null;
  }

  try {
    // Try to parse the property expression as a dictionary
    // This dictionary maps each category to its attributes
    let propertyDict: Record<string, any>;
    try {
      propertyDict = JSON.parse(property.expression);
    } catch {
      // If not JSON, try to evaluate it (would need evaluation context)
      // For now, return null if we can't parse it
      return null;
    }

    if (typeof propertyDict !== 'object' || propertyDict === null || Array.isArray(propertyDict)) {
      return null;
    }

    // Extract attributes for each category
    const categoryAttributes: Record<string, Record<string, any>> = {};
    for (const category of variable.categories) {
      if (category in propertyDict) {
        const categoryData = propertyDict[category];
        if (typeof categoryData === 'object' && categoryData !== null && !Array.isArray(categoryData)) {
          categoryAttributes[category] = categoryData;
        }
      }
    }

    return Object.keys(categoryAttributes).length > 0 ? categoryAttributes : null;
  } catch {
    return null;
  }
}

/**
 * Check if an expression references a variable
 */
function expressionReferencesVariable(expression: string, variableName: string): boolean {
  // Look for patterns like: variable_name or property_name[variable_name]
  const pattern = new RegExp(
    `\\b${variableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
    'g'
  );
  return pattern.test(expression);
}

/**
 * Get all properties that reference a categorical variable
 * (including nested lookups like dish_attributes[variable]['property'])
 */
export function getPropertiesForCategoricalVariable(
  variable: Variable,
  controls: Controls | null
): Property[] {
  if (!controls?.properties || variable.type !== 'categorical') {
    return [];
  }

  return controls.properties.filter(prop =>
    expressionReferencesVariable(prop.expression, variable.name)
  );
}

/**
 * Find all properties that could be related to categorical choices
 * This includes:
 * 1. Dictionary properties (like dish_attributes) - contains "attributes" for each category
 * 2. Individual derived properties that match category names (like shrimp_fried_rice_cost)
 * 
 * Note: "Attributes" are properties of categorical choices (e.g., cost, prep_time for each dish)
 * "Properties" are derived/computed values from variables
 */
export function getAllCategoricalProperties(
  variable: Variable,
  controls: Controls | null
): {
  dictionaryProperty: Property | null;  // Property containing attributes dictionary
  individualProperties: Array<{ property: Property; category: string }>;  // Derived properties
} {
  if (!controls?.properties || variable.type !== 'categorical' || !variable.categories) {
    return { dictionaryProperty: null, individualProperties: [] };
  }

  const result = {
    dictionaryProperty: getPropertyForCategoricalVariable(variable, controls),  // Contains attributes
    individualProperties: [] as Array<{ property: Property; category: string }>,  // Derived properties
  };

  // Find individual derived properties that match category names
  // e.g., if category is "shrimp_fried_rice", look for derived properties like "shrimp_fried_rice_cost"
  // These are computed properties, not attributes of the choice itself
  for (const category of variable.categories) {
    for (const property of controls.properties) {
      // Check if property name starts with category name (e.g., "shrimp_fried_rice_cost" starts with "shrimp_fried_rice")
      // or if property name exactly matches the category
      if (property.name.startsWith(category + '_') || property.name === category) {
        result.individualProperties.push({ property, category });
      }
    }
  }

  return result;
}

