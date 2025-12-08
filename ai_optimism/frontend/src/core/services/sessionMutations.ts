/**
 * Session mutation methods - write operations
 */

import { Session, Message, MessageRole, SessionMode } from './sessionManager';
import { AxiosInstance } from 'axios';

export class SessionMutations {
  constructor(
    private client: AxiosInstance,
    private setCurrentSession: (sessionId: string | null) => void
  ) {}

  // Create new session
  async createSession(mode: SessionMode, userId: string = 'default-user', researcherId?: string, version?: string): Promise<Session> {
    try {
      const response = await this.client.post('/sessions/', { mode, userId, researcherId, version });
      
      // Check if response is HTML (unexpected HTML response)
      const data = response.data;
      if (typeof data === 'string' && data.includes('<!DOCTYPE html>')) {
        const backendUrl = this.client.defaults.baseURL?.replace('/api', '') || 'unknown';
        console.error('[SessionManager] Received HTML instead of JSON - unexpected response');
        console.error('[SessionManager] Backend URL:', backendUrl);
        throw new Error(`unexpected_html_response: Backend returned HTML instead of JSON. Please verify the backend URL is correct: ${backendUrl}`);
      }
      
      const session = data;
      if (!session || !session.id) {
        console.error('[SessionManager] Created session missing id:', session);
        throw new Error('Session creation failed: response missing id');
      }

      // Set as current session
      this.setCurrentSession(session.id);

      return session;
    } catch (error: any) {
      console.error('[SessionManager] Failed to create session:', error);
      
      // Provide more helpful error messages
      if (error.code === 'ECONNREFUSED' || error.message === 'Network Error' || !error.response) {
        const backendUrl = this.client.defaults.baseURL?.replace('/api', '') || 'unknown';
        const errorMessage = `Cannot connect to backend server at ${backendUrl}. Please ensure the backend server is running.`;
        console.error('[SessionManager]', errorMessage);
        throw new Error(errorMessage);
      }
      
      // Re-throw with original error for other cases
      throw error;
    }
  }

  // Update session
  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
    try {
      const response = await this.client.put(`/sessions/${sessionId}`, updates);
      return response.data;
    } catch (error: any) {
      // Handle 404 (session not found)
      if (error.response?.status === 404) {
        console.warn('[SessionManager] Session not found (404):', sessionId);
        return null;
      }
      
      // Handle network errors (backend unreachable)
      const isNetworkError = error.code === 'ECONNREFUSED' || 
                            error.code === 'ERR_NETWORK' ||
                            error.message === 'Network Error' ||
                            !error.response;
      
      if (isNetworkError) {
        const backendUrl = this.client.defaults.baseURL?.replace('/api', '') || 'unknown';
        // Use warn instead of error for network issues - these are often transient
        // and the UI should handle them gracefully
        console.warn(
          `[SessionManager] Backend unreachable at ${backendUrl}. ` +
          `Session update failed but operation may continue with local state. ` +
          `Network error: ${error.message || error.code || 'Unknown'}`
        );
        return null;
      }
      
      // Handle other errors (HTTP errors like 500, etc.)
      const status = error.response?.status || 'Unknown status';
      const errorData = error.response?.data || error.message;
      const errorDetail = typeof errorData === 'object' ? JSON.stringify(errorData) : errorData;
      
      console.error('[SessionManager] Failed to update session:');
      console.error('  Status:', status);
      console.error('  Error:', errorDetail);
      console.error('  Full error:', error);
      
      // Log the request that failed for debugging
      if (error.config) {
        console.error('  Request URL:', error.config.url);
        console.error('  Request method:', error.config.method);
        console.error('  Request data:', error.config.data);
      }
      
      return null;
    }
  }

  // Add message to session
  async addMessage(
    sessionId: string,
    sender: MessageRole,
    content: string,
    metadata?: Message['metadata']
  ): Promise<Message | null> {
    try {
      const url = `/sessions/${sessionId}/messages`;
      const response = await this.client.post(url, { sender, content, metadata });
      return response.data;
    } catch (error: any) {
      const fullUrl = `${this.client.defaults.baseURL}/sessions/${sessionId}/messages`;
      console.error('[SessionManager] Failed to add message:', error);
      console.error('[SessionManager] Request URL was:', fullUrl);
      if (error.response) {
        console.error('[SessionManager] Response status:', error.response.status);
        console.error('[SessionManager] Response data:', error.response.data);
      }
      return null;
    }
  }

  // Send heartbeat to indicate client is active
  async sendHeartbeat(sessionId: string): Promise<void> {
    try {
      await this.client.post(`/sessions/${sessionId}/heartbeat`);
    } catch (error) {
      console.warn('[SessionManager] Heartbeat error:', error);
    }
  }

  // Delete session
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const response = await this.client.delete(`/sessions/${sessionId}`);
      this.setCurrentSession(null);
      return true;
    } catch (error: any) {
      console.error('[SessionManager] Failed to delete session:', error);
      if (error.response?.data) {
        console.error('[SessionManager] Error details:', error.response.data);
      }
      return false;
    }
  }

  // Clear all sessions (for testing/cleanup)
  async clearAllSessions(): Promise<boolean> {
    try {
      const response = await this.client.delete('/sessions/clear/');
      this.setCurrentSession(null);
      return true;
    } catch (error: any) {
      console.error('[SessionManager] Failed to clear sessions:', error);
      if (error.response?.data) {
        console.error('[SessionManager] Error details:', error.response.data);
      }
      return false;
    }
  }

  // Delete sessions by IP address
  async deleteSessionsByIP(ipAddress: string): Promise<{ deleted_count: number; message: string }> {
    try {
      // URL encode the IP address to handle special characters
      const encodedIP = encodeURIComponent(ipAddress);
      const response = await this.client.delete(`/sessions/by-ip/${encodedIP}`);
      return response.data;
    } catch (error: any) {
      console.error('[SessionManager] Failed to delete sessions by IP:', error);
      if (error.response?.data) {
        console.error('[SessionManager] Error details:', error.response.data);
      }
      throw error;
    }
  }
}

