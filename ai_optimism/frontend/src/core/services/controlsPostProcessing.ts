/**
 * Post-processing functions for generated controls
 * Validates, cleans, and transforms controls after AI generation
 */

import { cleanAttributes, transformAttributeExpressions } from './controlsGenerationUtils';

export interface CategoricalVariable {
  name: string;
  type: 'categorical';
  categories?: string[];
  attributes?: Record<string, Record<string, string | number | boolean>>;
  [key: string]: any;
}

/**
 * Process and validate categorical variables, preserving attributes
 */
export function processCategoricalVariables(
  variables: any[],
  attributesFromFormalization: Record<string, Record<string, Record<string, string | number | boolean>>>
): void {
  for (const variable of variables) {
    if (variable.type === 'categorical') {
      // Check if categories are defined
      if (!variable.categories || variable.categories.length === 0) {
        console.warn(`[Generate] Categorical variable "${variable.name}" missing categories array`);
        continue;
      }

      // CRITICAL: Preserve attributes from formalization if they exist and generated ones are missing
      if (attributesFromFormalization[variable.name] && !variable.attributes) {
        console.log(`[Generate] Restoring attributes for "${variable.name}" from formalization JSON`);
        variable.attributes = attributesFromFormalization[variable.name];
      }
      
      // Clean attributes to ensure only primitive values (string, number, boolean)
      if (variable.attributes) {
        const cleanedAttrs = cleanAttributes(variable.attributes);
        if (cleanedAttrs) {
          variable.attributes = cleanedAttrs;
          console.log(`[Generate] Variable "${variable.name}" attributes preserved:`, Object.keys(cleanedAttrs).length, 'categories');
        } else {
          console.warn(`[Generate] Variable "${variable.name}" attributes cleaned - no valid primitive values found`);
          // Try to restore from formalization if cleaning failed
          if (attributesFromFormalization[variable.name]) {
            variable.attributes = cleanAttributes(attributesFromFormalization[variable.name]) || variable.attributes;
          }
        }
      } else {
        console.warn(`[Generate] Categorical variable "${variable.name}" has no attributes field`);
        // Try to restore from formalization
        if (attributesFromFormalization[variable.name]) {
          console.log(`[Generate] Restoring missing attributes for "${variable.name}" from formalization JSON`);
          variable.attributes = cleanAttributes(attributesFromFormalization[variable.name]) || attributesFromFormalization[variable.name];
        }
      }
      
      // Check if attributes are defined after cleaning
      if (variable.attributes && Object.keys(variable.attributes).length > 0) {
        // Check that all categories have attributes
        const missingCategories = variable.categories.filter(
          (cat: string) => !variable.attributes || !(cat in variable.attributes)
        );
        if (missingCategories.length > 0) {
          console.warn(`[Generate] Variable "${variable.name}" missing attributes for categories: ${missingCategories.join(', ')}`);
        }
      } else {
        console.warn(`[Generate] Categorical variable "${variable.name}" missing attributes object`);
      }
    }
  }
}

/**
 * Transform all expressions in controls to use correct attribute syntax
 */
export function transformAllExpressions(
  controls: {
    properties?: Array<{ expression: string }>;
    objectives?: Array<{ expression: string }>;
    constraints?: Array<{ expression: string }>;
  },
  variableNames: string[]
): void {
  if (controls.properties) {
    for (const prop of controls.properties) {
      prop.expression = transformAttributeExpressions(prop.expression, variableNames);
    }
  }
  if (controls.objectives) {
    for (const obj of controls.objectives) {
      obj.expression = transformAttributeExpressions(obj.expression, variableNames);
    }
  }
  if (controls.constraints) {
    for (const con of controls.constraints) {
      con.expression = transformAttributeExpressions(con.expression, variableNames);
    }
  }
}

