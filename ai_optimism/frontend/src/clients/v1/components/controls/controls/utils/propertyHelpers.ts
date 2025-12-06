/**
 * Utility functions for property management and analysis
 */

import type { Controls } from '../types';

/**
 * Calculate how many times a property is used in objectives and constraints
 */
export function getPropertyUsageCount(propertyName: string, controls: Controls | null): number {
  let count = 0;
  controls?.objectives?.forEach(obj => {
    if (obj.expression.includes(propertyName)) count++;
  });
  controls?.constraints?.forEach(con => {
    if (con.expression.includes(propertyName)) count++;
  });
  return count;
}

/**
 * Filter to get only properties that are actually used
 */
export function getUsedProperties(controls: Controls | null) {
  if (!controls?.properties) return [];
  return controls.properties.filter(prop => getPropertyUsageCount(prop.name, controls) > 0);
}



