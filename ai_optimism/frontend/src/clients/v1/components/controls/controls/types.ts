/**
 * Type definitions for optimization controls
 */

export interface ModifierStrategy {
  type: 'gaussian' | 'uniform' | 'random_reset' | 'neighbor_step';
  // For continuous/gaussian
  sigma?: number;
  // For uniform
  stepSize?: number;
  // For discrete/categorical
  probability?: number; // Chance of modification
}

export interface Variable {
  name: string;
  type: 'continuous' | 'discrete' | 'categorical';
  min?: number;
  max?: number;
  default?: number;
  unit?: string;
  description: string;
  categories?: string[];
  currentCategory?: string;
  attributes?: Record<string, Record<string, string | number | boolean>>; // Attributes for each category: primitive values only (string, number, boolean). Example: { 'category1': { 'cost': 10, 'unit': 'USD' }, ... }
  modifierStrategy?: ModifierStrategy;
}

export interface Objective {
  name: string;
  expression: string;
  goal: 'minimize' | 'maximize';
  description: string;
  weight?: number; // Weight for combining multiple objectives (default: 1.0)
  min?: number; // Estimated minimum value for normalization
  max?: number; // Estimated maximum value for normalization
}

export interface Property {
  name: string;
  expression: string;
  description?: string; // Optional - omit for dictionary properties mapping categorical choices to attributes
}

export interface Constraint {
  expression: string;
  description: string;
  title: string; // Required - used in visualization and display
  type?: 'hard' | 'soft'; // Hard: must be satisfied, Soft: preferred but can be violated
  weight?: number; // For soft constraints: penalty weight (default: 10.0)
}

export interface Algorithm {
  type: string;
  encoding?: string;
  constraintHandling?: string;
  populationSize?: number;
  maxGenerations?: number;
  crossoverRate?: number;
  mutationRate?: number;
}

export interface Controls {
  variables: Variable[];
  objectives?: Objective[];
  properties?: Property[];
  constraints?: Constraint[];
  algorithm?: Algorithm;
}
