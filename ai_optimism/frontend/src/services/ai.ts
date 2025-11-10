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
  }
};

export default aiApi;
