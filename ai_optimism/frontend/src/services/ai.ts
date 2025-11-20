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
    // Use the new chat endpoint for validation as it's the most reliable way to test connection
    try {
      const response = await axios.post('/api/chat', {
        apiKey: request.api_key,
        provider: request.provider,
        model: request.model,
        messages: [{ role: 'user', content: 'Test connection' }]
      });

      if (response.status === 200) {
        return {
          status: 'success',
          message: 'Successfully connected',
          provider: request.provider,
          model: request.model
        };
      }
      throw new Error('Validation failed');
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Connection failed',
        provider: request.provider,
        model: request.model
      };
    }
  },

  // Get list of available providers and their models
  listProviders: async (): Promise<ProvidersResponse> => {
    // Return static list as backend no longer provides this
    return {
      providers: {
        google: {
          name: 'Google Gemini',
          models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
          requires_api_key: true,
          endpoint: null
        },
        openai: {
          name: 'OpenAI',
          models: ['gpt-4o', 'gpt-4-turbo'],
          requires_api_key: true,
          endpoint: null
        },
        anthropic: {
          name: 'Anthropic Claude',
          models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
          requires_api_key: true,
          endpoint: null
        },
        ollama: {
          name: 'Ollama (Local)',
          models: ['llama2', 'mistral'],
          requires_api_key: false,
          endpoint: 'http://localhost:11434'
        },
        custom: {
          name: 'Custom Endpoint',
          models: ['custom-model'],
          requires_api_key: true,
          endpoint: null
        }
      }
    };
  },

  // Generate variable suggestions using AI
  generateVariables: async (request: GenerateVariablesRequest): Promise<GenerateVariablesResponse> => {
    // Map to the new consolidated generate endpoint
    const response = await axios.post('/api/generate', {
      description: request.description || request.problem_name,
      model: request.model
    }, {
      headers: { 'x-api-key': request.api_key }
    });

    return {
      status: 'success',
      message: 'Generated variables',
      variables: response.data.variables
    };
  },

  // Generate computed properties based on variables
  generateProperties: async (request: GeneratePropertiesRequest): Promise<GeneratePropertiesResponse> => {
    // Map to the new consolidated generate endpoint
    // Note: The new endpoint generates everything at once, so we might get more than just properties
    const response = await axios.post('/api/generate', {
      description: request.description || request.problem_name,
      model: request.model
    }, {
      headers: { 'x-api-key': request.api_key }
    });

    return {
      status: 'success',
      message: 'Generated properties',
      properties: response.data.properties
    };
  },

  // Generate objective function code from description
  generateObjective: async (request: GenerateObjectiveRequest): Promise<GenerateObjectiveResponse> => {
    // The new endpoint returns structured objectives, not raw code.
    // We'll adapt the response to fit the expected interface or warn about the change.
    const response = await axios.post('/api/generate', {
      description: request.objective_description || request.description,
      model: request.model
    }, {
      headers: { 'x-api-key': request.api_key }
    });

    // Construct a simple code representation from the structured objective
    const objectives = response.data.objectives || [];
    const code = objectives.map((obj: any) =>
      `# ${obj.name}\n# ${obj.description}\n# Goal: ${obj.goal}\n${obj.expression}`
    ).join('\n\n');

    return {
      status: 'success',
      message: 'Generated objectives',
      code: code,
      explanation: 'Generated from structured objectives'
    };
  },

  // Generate constraint expressions
  generateConstraints: async (request: GenerateConstraintsRequest): Promise<GenerateConstraintsResponse> => {
    const response = await axios.post('/api/generate', {
      description: request.description || request.problem_name,
      model: request.model
    }, {
      headers: { 'x-api-key': request.api_key }
    });

    return {
      status: 'success',
      message: 'Generated constraints',
      constraints: response.data.constraints
    };
  }
};

export default aiApi;
