/**
 * Type definitions for optimization controls
 */

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
}

export interface Objective {
  name: string;
  expression: string;
  goal: 'minimize' | 'maximize';
  description: string;
}

export interface Property {
  name: string;
  expression: string;
  description: string;
}

export interface Constraint {
  expression: string;
  description: string;
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
