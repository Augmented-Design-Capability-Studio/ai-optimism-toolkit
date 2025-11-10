import axios from 'axios';

const API_URL = '/api';

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'ollama' | 'custom';

export interface AIProviderConfig {
  provider: AIProvider;
  api_key: string;
  model: string;
  endpoint?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface AIValidationRequest {
  provider: AIProvider;
  api_key: string;
  model: string;
  endpoint?: string;
}

export interface AIValidationResponse {
  status: 'success' | 'error';
  message: string;
  provider: string;
  model: string;
  details?: any;
}

export interface AIProviderInfo {
  name: string;
  models: string[];
  requires_api_key: boolean;
  endpoint: string | null;
}

export interface ProvidersResponse {
  providers: Record<AIProvider, AIProviderInfo>;
}

export interface GenerateVariablesRequest {
  problem_name: string;
  description?: string;
  provider: AIProvider;
  api_key: string;
  model: string;
  endpoint?: string;
}

export interface GeneratedVariable {
  name: string;
  type: 'numerical' | 'categorical';
  min?: number;
  max?: number;
  unit?: string;
  categories?: string[];
  modifier_strategy?: 'cycle' | 'random';
  reasoning?: string;
}

export interface GenerateVariablesResponse {
  status: 'success' | 'error';
  message: string;
  variables?: GeneratedVariable[];
}

export interface GeneratePropertiesRequest {
  problem_name: string;
  description?: string;
  variables: GeneratedVariable[];
  provider: AIProvider;
  api_key: string;
  model: string;
  endpoint?: string;
}

export interface GeneratedProperty {
  name: string;
  expression: string;
  description: string;
}

export interface GeneratePropertiesResponse {
  status: 'success' | 'error';
  message: string;
  properties?: GeneratedProperty[];
}

export interface GenerateObjectiveRequest {
  problem_name: string;
  description: string;
  objective_description: string;
  variables: GeneratedVariable[];
  properties?: GeneratedProperty[];
  provider: AIProvider;
  api_key: string;
  model: string;
  endpoint?: string;
}

export interface GenerateObjectiveResponse {
  status: 'success' | 'error';
  message: string;
  code?: string;
  explanation?: string;
}

export interface GenerateConstraintsRequest {
  problem_name: string;
  description?: string;
  variables: GeneratedVariable[];
  properties?: GeneratedProperty[];
  provider: AIProvider;
  api_key: string;
  model: string;
  endpoint?: string;
}

export interface GeneratedConstraint {
  expression: string;
  description: string;
}

export interface GenerateConstraintsResponse {
  status: 'success' | 'error';
  message: string;
  constraints?: GeneratedConstraint[];
}

const aiApi = {
  // Validate AI provider connection
  validateConnection: async (request: AIValidationRequest): Promise<AIValidationResponse> => {
    const response = await axios.post(`${API_URL}/ai/validate-connection/`, request);
    return response.data;
  },

  // Get list of available providers and their models
  listProviders: async (): Promise<ProvidersResponse> => {
    const response = await axios.get(`${API_URL}/ai/providers/`);
    return response.data;
  },

  // Generate variable suggestions using AI
  generateVariables: async (request: GenerateVariablesRequest): Promise<GenerateVariablesResponse> => {
    const response = await axios.post(`${API_URL}/ai/generate-variables/`, request);
    return response.data;
  },

  // Generate computed properties based on variables
  generateProperties: async (request: GeneratePropertiesRequest): Promise<GeneratePropertiesResponse> => {
    const response = await axios.post(`${API_URL}/ai/generate-properties/`, request);
    return response.data;
  },

  // Generate objective function code from description
  generateObjective: async (request: GenerateObjectiveRequest): Promise<GenerateObjectiveResponse> => {
    const response = await axios.post(`${API_URL}/ai/generate-objective/`, request);
    return response.data;
  },

  // Generate constraint expressions
  generateConstraints: async (request: GenerateConstraintsRequest): Promise<GenerateConstraintsResponse> => {
    const response = await axios.post(`${API_URL}/ai/generate-constraints/`, request);
    return response.data;
  }
};

export default aiApi;
