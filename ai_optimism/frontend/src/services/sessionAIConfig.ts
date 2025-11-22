/**
 * Service for managing session-specific AI provider configurations
 */
import axios from 'axios';
import { useBackend } from '../contexts/BackendContext';
import type { AIProvider } from './ai';

// Create API client function that uses backend URL
const getApiClient = () => {
  // Get backend URL from context or use default
  // Note: This is a workaround - ideally we'd use a hook, but services can't use hooks
  // So we'll get the backend URL from localStorage or use default
  const backendUrl = typeof window !== 'undefined' 
    ? (localStorage.getItem('backend_config') || 'http://localhost:8000')
    : 'http://localhost:8000';
  
  return axios.create({
    baseURL: `${backendUrl}/api`,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export interface AISessionConfigStatus {
  sessionId: string;
  provider: string;
  model: string;
  endpoint: string | null;
  status: 'disconnected' | 'connected' | 'error';
  lastValidated: number | null;
  setBy: 'user' | 'researcher';
  setAt: number;
  errorMessage: string | null;
}

export interface SetAISessionConfigRequest {
  provider: AIProvider;
  apiKey: string;
  model: string;
  endpoint?: string;
  setBy: 'user' | 'researcher';
}

export interface ValidateAIConfigResponse {
  status: 'connected' | 'error';
  message: string;
  lastValidated: number | null;
}

/**
 * Get AI provider configuration status for a session (does NOT include API key)
 * Returns null if no config exists (404)
 */
export async function getAIConfig(sessionId: string): Promise<AISessionConfigStatus | null> {
  const apiClient = getApiClient();
  try {
    const response = await apiClient.get(`/sessions/${sessionId}/ai-config`);
    return response.data;
  } catch (error: any) {
    // 404 means no config exists yet - this is expected and not an error
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Set AI provider configuration for a session (API key is encrypted server-side)
 */
export async function setAIConfig(
  sessionId: string,
  config: SetAISessionConfigRequest
): Promise<AISessionConfigStatus> {
  if (!sessionId) {
    throw new Error('Session ID is required to set AI config');
  }
  
  const apiClient = getApiClient();
  const url = `/sessions/${sessionId}/ai-config`;
  console.log('[setAIConfig] Setting AI config for session:', sessionId, 'URL:', url, 'BaseURL:', apiClient.defaults.baseURL);
  
  try {
    const response = await apiClient.post(url, config);
    console.log('[setAIConfig] Successfully set AI config');
    return response.data;
  } catch (error: any) {
    // Extract error details safely - handle different error types
    let status: number | undefined;
    let detail: string;
    let errorMessage: string;
    
    // Check if it's an axios error
    if (error.response) {
      // Axios error with response (server responded with error status)
      status = error.response.status;
      detail = error.response.data?.detail || error.response.data?.message || error.message || 'Server error';
      errorMessage = `HTTP ${status}: ${detail}`;
    } else if (error.request) {
      // Axios error - request was made but no response received (network error)
      status = undefined;
      detail = 'Network error: Could not reach the backend server';
      errorMessage = detail;
    } else {
      // Other error type
      status = undefined;
      detail = error.message || String(error) || 'Unknown error';
      errorMessage = detail;
    }
    
    // Log comprehensive error details for debugging
    console.error('[setAIConfig] Error details:', {
      status,
      detail,
      errorMessage,
      url,
      fullUrl: `${apiClient.defaults.baseURL}${url}`,
      sessionId,
      hasResponse: !!error?.response,
      hasRequest: !!error?.request,
      responseData: error?.response?.data,
      responseStatus: error?.response?.status,
      responseStatusText: error?.response?.statusText,
      requestConfig: error?.config ? {
        url: error.config.url,
        method: error.config.method,
        baseURL: error.config.baseURL,
        data: error.config.data,
      } : null,
      errorType: error?.response ? 'axios-response' : error?.request ? 'axios-request' : 'other',
      errorKeys: Object.keys(error || {}),
    });
    
    if (status === 404) {
      throw new Error(`Session not found or endpoint not available. ${detail}. Make sure the session exists and the backend server has been restarted to include the new AI config endpoints.`);
    }
    
    // Re-throw with a more descriptive message
    throw new Error(`Failed to set AI config: ${errorMessage}${status ? ` (HTTP ${status})` : ''}`);
  }
}

/**
 * Validate the stored API key for a session
 */
export async function validateAIConfig(sessionId: string): Promise<ValidateAIConfigResponse> {
  const apiClient = getApiClient();
  const response = await apiClient.post(`/sessions/${sessionId}/ai-config/validate`);
  return response.data;
}

/**
 * Get decrypted API key for making AI requests (not for display)
 * This should only be called when needed for API requests, never for UI display
 * Returns null if no config exists (404)
 */
export async function getAIConfigKey(sessionId: string): Promise<{
  apiKey: string;
  provider: string;
  model: string;
  endpoint: string | null;
} | null> {
  const apiClient = getApiClient();
  try {
    const response = await apiClient.get(`/sessions/${sessionId}/ai-config/key`);
    return response.data;
  } catch (error: any) {
    // 404 means no config exists yet - this is expected and not an error
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

