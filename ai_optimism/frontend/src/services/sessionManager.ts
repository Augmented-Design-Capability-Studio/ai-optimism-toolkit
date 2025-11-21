/**
 * Session manager for wizard-of-oz mode
 * Uses backend API for cross-device session sharing
 */

import { useBackend } from '../contexts/BackendContext';
import { useMemo } from 'react';

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
    type?: 'formalization' | 'controls-generation';
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
  isResearcherTyping?: boolean;
  isAIResponding?: boolean;
}

interface BackendApi {
  evaluate: string;
  optimization: {
    createProblem: string;
    listProblems: string;
    execute: string;
    clear: string;
  };
  sessions: {
    create: string;
    list: string;
    get: (id: string) => string;
    update: (id: string) => string;
    delete: (id: string) => string;
    addMessage: (id: string) => string;
    getMessages: (id: string) => string;
    heartbeat: (id: string) => string;
    waiting: string;
    clear: string;
  };
}

class SessionManager {
  private readonly CURRENT_SESSION_KEY = 'wizard_current_session';
  private backendApi: BackendApi;

  constructor(backendApi: BackendApi) {
    if (!backendApi) {
      throw new Error('backendApi is required');
    }
    if (!backendApi.sessions) {
      throw new Error('backendApi.sessions is required');
    }
    this.backendApi = backendApi;
  }

  // Get all sessions
  async getSessions(): Promise<Session[]> {
    if (!this.backendApi) {
      console.error('[SessionManager] this.backendApi is undefined!');
      return [];
    }
    if (!this.backendApi.sessions) {
      console.error('[SessionManager] this.backendApi.sessions is undefined!');
      return [];
    }
    try {
      const response = await fetch(this.backendApi.sessions.list);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return await response.json();
    } catch (error) {
      console.error('[SessionManager] Failed to get sessions:', error);
      return [];
    }
  }

  // Get single session
  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const response = await fetch(this.backendApi.sessions.get(sessionId));
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch session');
      }
      return await response.json();
    } catch (error) {
      console.error('[SessionManager] Failed to get session:', error);
      return null;
    }
  }

  // Create new session
  async createSession(mode: SessionMode, userId: string = 'default-user', researcherId?: string): Promise<Session> {
    try {
      const response = await fetch(this.backendApi.sessions.create, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, userId, researcherId }),
      });

      if (!response.ok) throw new Error('Failed to create session');

      const session = await response.json();

      // Set as current session
      this.setCurrentSession(session.id);

      return session;
    } catch (error) {
      console.error('[SessionManager] Failed to create session:', error);
      throw error;
    }
  }

  // Update session
  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
    try {
      const response = await fetch(this.backendApi.sessions.update(sessionId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to update session');
      }

      return await response.json();
    } catch (error) {
      console.error('[SessionManager] Failed to update session:', error);
      return null;
    }
  }

  // Set researcher typing indicator
  async setResearcherTyping(sessionId: string, isTyping: boolean): Promise<void> {
    await this.updateSession(sessionId, { isResearcherTyping: isTyping });
  }

  // Add message to session
  async addMessage(
    sessionId: string,
    sender: MessageRole,
    content: string,
    metadata?: Message['metadata']
  ): Promise<Message | null> {
    try {
      const response = await fetch(this.backendApi.sessions.addMessage(sessionId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender, content, metadata }),
      });

      if (!response.ok) throw new Error('Failed to add message');

      return await response.json();
    } catch (error) {
      console.error('[SessionManager] Failed to add message:', error);
      return null;
    }
  }

  // Get messages for session
  async getMessages(sessionId: string): Promise<Message[]> {
    try {
      const response = await fetch(this.backendApi.sessions.getMessages(sessionId));
      if (!response.ok) throw new Error('Failed to fetch messages');
      return await response.json();
    } catch (error) {
      console.error('[SessionManager] Failed to get messages:', error);
      return [];
    }
  }

  // Send heartbeat to indicate client is active
  async sendHeartbeat(sessionId: string): Promise<void> {
    try {
      const response = await fetch(this.backendApi.sessions.heartbeat(sessionId), {
        method: 'POST',
      });
      if (!response.ok) {
        console.warn('[SessionManager] Heartbeat failed:', response.status);
      }
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
      const session = await this.getSession(sessionId);
      return session;
    }
    return null;
  }

  // Get active sessions (for researcher dashboard)
  // Note: Returns all sessions including completed ones
  // Researcher must explicitly delete to remove from list
  async getActiveSessions(): Promise<Session[]> {
    return await this.getSessions();
  }

  // Get sessions waiting for researcher
  async getWaitingSessions(): Promise<Session[]> {
    try {
      const response = await fetch(this.backendApi.sessions.waiting);
      if (!response.ok) throw new Error('Failed to fetch waiting sessions');
      return await response.json();
    } catch (error) {
      console.error('[SessionManager] Failed to get waiting sessions:', error);
      return [];
    }
  }

  // Delete session
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(this.backendApi.sessions.delete(sessionId), {
        method: 'DELETE',
      });

      if (!response.ok) return false;

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

  // Clear all sessions (for testing)
  async clearAllSessions(): Promise<void> {
    try {
      await fetch(this.backendApi.sessions.clear, { method: 'DELETE' });
      this.setCurrentSession(null);
    } catch (error) {
      console.error('[SessionManager] Failed to clear sessions:', error);
    }
  }

  // Subscribe to session updates (polling for backend mode)
  subscribeToSession(
    sessionId: string,
    callback: (session: Session | null) => void,
    intervalMs: number = 1000
  ): () => void {
    let lastUpdate = 0;
    let sessionWasDeleted = false;

    const checkUpdates = async () => {
      try {
        const session = await this.getSession(sessionId);

        // If session no longer exists and we haven't handled this yet
        if (!session) {
          if (!sessionWasDeleted) {
            sessionWasDeleted = true;
            console.log('[SessionManager] Session', sessionId, 'was deleted - notifying callback');
            callback(null); // Notify callback that session was deleted
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
        console.error('[SessionManager] Error checking session updates:', error);
      }
    };

    // Run initial check immediately
    checkUpdates();

    const intervalId = setInterval(checkUpdates, intervalMs);

    // Return cleanup function
    return () => clearInterval(intervalId);
  }
}

// Factory function to create session manager with backend API
export const createSessionManager = (backendApi: BackendApi) => {
  return new SessionManager(backendApi);
};

// React hook to use session manager with backend context
export const useSessionManager = () => {
  const context = useBackend();
  if (!context) {
    throw new Error('BackendContext not found');
  }
  const { backendApi } = context;
  if (!backendApi) {
    throw new Error('backendApi is undefined');
  }
  if (!backendApi.sessions) {
    throw new Error('backendApi.sessions is undefined');
  }
  // Memoize the session manager instance
  return useMemo(() => createSessionManager(backendApi), [backendApi]);
};
