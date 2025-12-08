/**
 * Session query methods - read operations
 */

import { Session, Message } from './sessionManager';
import { AxiosInstance } from 'axios';

export class SessionQueries {
  constructor(private client: AxiosInstance) {}

  // Get all sessions
  async getSessions(caller?: string): Promise<Session[]> {
    // Get caller info if not provided
    if (!caller && typeof Error !== 'undefined') {
      try {
        const stack = new Error().stack;
        if (stack) {
          const lines = stack.split('\n');
          for (let i = 2; i < Math.min(lines.length, 5); i++) {
            const line = lines[i];
            const match = line.match(/at\s+(\w+)/) || line.match(/at\s+.*?\.(\w+)/);
            if (match && !match[1].includes('getSessions') && !match[1].includes('getActiveSessions')) {
              caller = match[1];
              break;
            }
          }
        }
      } catch (e) {
        // Ignore
      }
    }
    
    try {
      const response = await this.client.get('/sessions/');
      return response.data;
    } catch (error) {
      console.error('[SessionManager] Failed to get sessions:', error);
      return [];
    }
  }

  // Get single session
  async getSession(sessionId: string, caller?: string): Promise<Session | null> {
    // Get caller info from stack trace if not provided
    if (!caller && typeof Error !== 'undefined') {
      try {
        const stack = new Error().stack;
        if (stack) {
          const lines = stack.split('\n');
          // Skip first 2 lines (Error and getSession), find first meaningful caller
          for (let i = 2; i < Math.min(lines.length, 5); i++) {
            const line = lines[i];
            // Extract function/component name
            const match = line.match(/at\s+(\w+)/) || line.match(/at\s+.*?\.(\w+)/);
            if (match && !match[1].includes('getSession') && !match[1].includes('getCurrentSession')) {
              caller = match[1];
              break;
            }
          }
        }
      } catch (e) {
        // Ignore stack trace errors
      }
    }
    
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


  // Get active sessions (for researcher dashboard)
  async getActiveSessions(caller?: string): Promise<Session[]> {
    // Get caller info if not provided
    if (!caller && typeof Error !== 'undefined') {
      try {
        const stack = new Error().stack;
        if (stack) {
          const lines = stack.split('\n');
          for (let i = 2; i < Math.min(lines.length, 5); i++) {
            const line = lines[i];
            const match = line.match(/at\s+(\w+)/) || line.match(/at\s+.*?\.(\w+)/);
            if (match && !match[1].includes('getActiveSessions')) {
              caller = match[1];
              break;
            }
          }
        }
      } catch (e) {
        // Ignore
      }
    }
    return await this.getSessions(caller || 'getActiveSessions');
  }

  // Get sessions waiting for researcher
  async getWaitingSessions(): Promise<Session[]> {
    try {
      const response = await this.client.get('/sessions/waiting');
      return response.data;
    } catch (error) {
      console.error('[SessionManager] Failed to get waiting sessions:', error);
      return [];
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
}

