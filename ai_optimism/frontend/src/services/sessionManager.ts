/**
 * Session manager for wizard-of-oz mode
 * Uses backend API for cross-device session sharing
 */

import { useBackend } from '../contexts/BackendContext';
import { useMemo } from 'react';
import axios, { AxiosInstance } from 'axios';

export type MessageRole = 'user' | 'researcher' | 'ai';
export type SessionMode = 'ai' | 'experimental';
export type SessionStatus = 'active' | 'waiting' | 'formalized' | 'completed';

export interface Message {
  id: string;
  sessionId: string;
  sender: MessageRole;
  content: string;
  timestamp: number;
  metadata?: {
    type?: 'formalization' | 'controls-generation' | 'variables-update' | 'objectives-update' | 'constraints-update' | 'properties-update';
    incomplete?: boolean;
    controlsGenerated?: boolean;
    controlsError?: string;
    structuredData?: unknown;
  };
}

export interface Session {
  id: string;
  mode: SessionMode;
  status: SessionStatus;
  userId: string;
  researcherId?: string;
  createdAt: number;
  updatedAt: number;
  lastActivity: number;  // Timestamp of last client activity
  messages: Message[];
  isAIResponding?: boolean;
  readyToFormalize?: boolean;
  ipAddress?: string | null;  // Client IP address
}

class SessionManager {
  private readonly CURRENT_SESSION_KEY = 'wizard_current_session';
  private client: AxiosInstance;

  constructor(backendUrl: string) {
    this.client = axios.create({
      baseURL: `${backendUrl}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Get all sessions
  async getSessions(): Promise<Session[]> {
    try {
      const response = await this.client.get('/sessions/');
      return response.data;
    } catch (error) {
      console.error('[SessionManager] Failed to get sessions:', error);
      return [];
    }
  }

  // Get single session
  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const response = await this.client.get(`/sessions/${sessionId}`);
      
      // Check if response is HTML (unexpected HTML response)
      const contentType = response.headers['content-type'] || '';
      const data = response.data;
      
      if (typeof data === 'string' && data.includes('<!DOCTYPE html>')) {
        const backendUrl = this.client.defaults.baseURL?.replace('/api', '') || 'unknown';
        console.error('[SessionManager] Received HTML instead of JSON - unexpected response');
        console.error('[SessionManager] Backend URL:', backendUrl);
        throw new Error(`unexpected_html_response: Backend returned HTML instead of JSON. Please verify the backend URL is correct: ${backendUrl}`);
      }
      
      const session = data;
      if (!session || !session.id) {
        console.error('[SessionManager] Session response missing id:', session);
        return null;
      }
      return session;
    } catch (error: any) {
      if (error.message?.includes('unexpected_html_response')) {
        throw error; // Re-throw HTML response errors
      }
      
      if (error.response?.status === 404) {
        console.log('[SessionManager] Session not found (404):', sessionId);
        return null;
      }
      
      // Check if response data is HTML
      if (error.response?.data && typeof error.response.data === 'string' && error.response.data.includes('<!DOCTYPE html>')) {
        const backendUrl = this.client.defaults.baseURL?.replace('/api', '') || 'unknown';
        console.error('[SessionManager] Unexpected HTML response detected in error');
        console.error('[SessionManager] Backend URL:', backendUrl);
        throw new Error(`unexpected_html_response: Backend returned HTML instead of JSON. Please verify the backend URL is correct: ${backendUrl}`);
      }
      
      // Network errors - provide helpful message
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response) {
        const backendUrl = this.client.defaults.baseURL?.replace('/api', '') || 'unknown';
        console.error('[SessionManager] Network error getting session:', sessionId);
        console.error('[SessionManager] Backend URL:', backendUrl);
        console.error('[SessionManager] Error:', error.message || error.code);
        throw error; // Re-throw so caller can handle it
      }
      
      console.error('[SessionManager] Failed to get session:', error);
      return null;
    }
  }

  // Create new session
  async createSession(mode: SessionMode, userId: string = 'default-user', researcherId?: string): Promise<Session> {
    try {
      const response = await this.client.post('/sessions/', { mode, userId, researcherId });
      
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
      const fullUrl = `${this.client.defaults.baseURL}${url}`;
      console.log('[SessionManager] Adding message to:', fullUrl);
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

  // Get messages for session
  async getMessages(sessionId: string): Promise<Message[]> {
    try {
      const response = await this.client.get(`/sessions/${sessionId}/messages`);
      return response.data;
    } catch (error) {
      console.error('[SessionManager] Failed to get messages:', error);
      return [];
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

  // Set current active session
  setCurrentSession(sessionId: string | null): void {
    if (typeof window === 'undefined') return;
    if (sessionId) {
      localStorage.setItem(this.CURRENT_SESSION_KEY, sessionId);
    } else {
      localStorage.removeItem(this.CURRENT_SESSION_KEY);
    }
  }

  // Get current active session
  async getCurrentSession(): Promise<Session | null> {
    if (typeof window === 'undefined') return null;
    const sessionId = localStorage.getItem(this.CURRENT_SESSION_KEY);
    if (sessionId) {
      try {
        const session = await this.getSession(sessionId);
        // If session not found or network error, clear the stale sessionId
        if (!session) {
          console.warn('[SessionManager] Stale sessionId in localStorage, clearing:', sessionId);
          this.setCurrentSession(null);
        }
        return session;
      } catch (error: any) {
        // Network error or other issue - clear stale sessionId
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response) {
          console.warn('[SessionManager] Network error getting session, clearing stale sessionId:', sessionId);
          this.setCurrentSession(null);
        }
        return null;
      }
    }
    return null;
  }

  // Get active sessions (for researcher dashboard)
  async getActiveSessions(): Promise<Session[]> {
    return await this.getSessions();
  }

  // Get sessions waiting for researcher
  async getWaitingSessions(): Promise<Session[]> {
    try {
      const response = await this.client.get('/sessions/waiting/');
      return response.data;
    } catch (error) {
      console.error('[SessionManager] Failed to get waiting sessions:', error);
      return [];
    }
  }

  // Delete session
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await this.client.delete(`/sessions/${sessionId}`);

      // Clear current session if deleted
      const current = await this.getCurrentSession();
      if (current?.id === sessionId) {
        this.setCurrentSession(null);
      }

      return true;
    } catch (error) {
      console.error('[SessionManager] Failed to delete session:', error);
      return false;
    }
  }

  // Clear all sessions (for testing/cleanup)
  async clearAllSessions(): Promise<boolean> {
    try {
      const response = await this.client.delete('/sessions/clear/');
      this.setCurrentSession(null);
      console.log('[SessionManager] All sessions cleared:', response.data);
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
      console.log('[SessionManager] Deleted sessions by IP:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[SessionManager] Failed to delete sessions by IP:', error);
      if (error.response?.data) {
        console.error('[SessionManager] Error details:', error.response.data);
      }
      throw error;
    }
  }

  // Get sessions with IP addresses (for admin view)
  async getSessionsWithIPs(): Promise<Array<{ id: string; ipAddress: string | null; userId: string; mode: string; status: string; createdAt: number; lastActivity: number; messageCount: number }>> {
    try {
      const response = await this.client.get('/sessions/with-ips');
      return response.data;
    } catch (error: any) {
      console.error('[SessionManager] Failed to get sessions with IPs:', error);
      throw error;
    }
  }

  // Subscribe to session updates (polling for backend mode)
  subscribeToSession(
    sessionId: string,
    callback: (session: Session | null) => void,
    intervalMs: number = 2500
  ): () => void {
    let lastUpdate = 0;
    let sessionWasDeleted = false;
    let isChecking = false; // Prevent overlapping requests
    let intervalId: NodeJS.Timeout | null = null;

    const checkUpdates = async () => {
      // Skip if already checking to prevent overlapping requests
      if (isChecking) {
        return;
      }
      
      isChecking = true;
      try {
        const session = await this.getSession(sessionId);

        // If session no longer exists and we haven't handled this yet
        if (!session) {
          if (!sessionWasDeleted) {
            sessionWasDeleted = true;
            console.log('[SessionManager] Session', sessionId, 'was deleted - stopping subscription');
            callback(null); // Notify callback that session was deleted
            // Stop the interval to prevent further polling
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
          }
          // Stop checking - session is gone
          return;
        }

        // Reset deletion flag if session exists again (shouldn't happen but safety check)
        sessionWasDeleted = false;

        // If session exists and has updates, trigger callback
        if (session.updatedAt > lastUpdate) {
          lastUpdate = session.updatedAt;
          callback(session);
        }
      } catch (error) {
        // If we get a 404 error, treat it as deleted session
        if ((error as any)?.response?.status === 404) {
          if (!sessionWasDeleted) {
            sessionWasDeleted = true;
            console.log('[SessionManager] Session', sessionId, 'not found (404) - stopping subscription');
            callback(null);
            // Stop the interval to prevent further polling
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
          }
          return;
        }
        console.error('[SessionManager] Error checking session updates:', error);
      } finally {
        isChecking = false;
      }
    };

    // Run initial check immediately
    checkUpdates();

    intervalId = setInterval(checkUpdates, intervalMs);

    // Return cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }
}

// Factory function to create session manager
export const createSessionManager = (backendUrl: string) => {
  return new SessionManager(backendUrl);
};

// React hook to use session manager
export const useSessionManager = () => {
  const context = useBackend();
  if (!context) {
    throw new Error('BackendContext not found');
  }

  const { state } = context;

  // Memoize the session manager instance
  return useMemo(() => createSessionManager(state.backendUrl), [state.backendUrl]);
};
