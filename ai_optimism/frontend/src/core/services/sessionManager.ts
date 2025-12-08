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
    type?: 'formalization' | 'controls-generation' | 'optimization-run' | 'variables-update' | 'objectives-update' | 'constraints-update' | 'properties-update';
    incomplete?: boolean;
    controlsGenerated?: boolean;
    controlsError?: string;
    errorDetails?: string;
    error?: boolean;
    structuredData?: unknown;
    validation?: {
      errors?: string[];
      warnings?: string[];
    };
    // Optimization run metadata
    runId?: string;
    status?: 'running' | 'completed' | 'failed';
    bestScore?: number;
    results?: unknown;
    config?: {
      population_size?: number;
      max_iterations?: number;
    };
    optimizationPacket?: {
      problem: {
        id: string;
        name: string;
        description?: string;
        variables: unknown[];
        objectives: unknown[];
        properties?: unknown[];
        constraints?: unknown[];
      };
      config: {
        problem_id: string;
        population_size: number;
        max_iterations: number;
        convergence_threshold: number;
        session_id?: string | null;
        heuristic_weights?: unknown;
      };
    };
    heuristic_map?: unknown;
  };
}

export interface AISessionConfigStatus {
  sessionId: string;
  provider: string;
  model: string;
  endpoint?: string | null;
  status: string;
  lastValidated?: number | null;
  setBy: string;
  setAt: number;
  errorMessage?: string | null;
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
  version?: string | null;  // Frontend version (v1, v2, v3, etc.)
  systemPrompt?: string | null;  // Custom system prompt for this session
  aiConfig?: AISessionConfigStatus | null;  // AI config status included in session response
}

import { SessionQueries } from './sessionQueries';
import { SessionMutations } from './sessionMutations';
import { SessionSubscriptions } from './sessionSubscriptions';

class SessionManager {
  private readonly CURRENT_SESSION_KEY = 'wizard_current_session';
  private client: AxiosInstance;
  private queries: SessionQueries;
  private mutations: SessionMutations;
  // Shared heartbeat controllers per sessionId (one per runtime)
  private static heartbeatControllers: Map<string, {
    timerId: NodeJS.Timeout;
    lastSent: number;
    inFlight: boolean;
    refCount: number;
    intervalMs: number;
  }> = new Map();

  constructor(backendUrl: string) {
    this.client = axios.create({
      baseURL: `${backendUrl}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Initialize sub-modules
    this.queries = new SessionQueries(this.client);
    this.mutations = new SessionMutations(this.client, (sessionId) => this.setCurrentSession(sessionId));
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

  // Query methods - delegate to SessionQueries
  async getSessions(caller?: string): Promise<Session[]> {
    return this.queries.getSessions(caller);
  }

  // In-flight dedupe to avoid bursty concurrent requests for same session
  private static getSessionCache = new Map<string, { promise: Promise<Session | null>; ts: number }>();
  private static GET_SESSION_DEDUP_MS = 900;

  async getSession(sessionId: string, caller?: string): Promise<Session | null> {
    const now = Date.now();
    const cached = SessionManager.getSessionCache.get(sessionId);
    if (cached && now - cached.ts < SessionManager.GET_SESSION_DEDUP_MS) {
      return cached.promise;
    }

    const promise = this.queries.getSession(sessionId, caller);
    SessionManager.getSessionCache.set(sessionId, { promise, ts: now });

    try {
      const result = await promise;
      // refresh timestamp on success to extend dedupe window
      SessionManager.getSessionCache.set(sessionId, { promise: Promise.resolve(result), ts: Date.now() });
      return result;
    } catch (err) {
      // do not cache failures
      SessionManager.getSessionCache.delete(sessionId);
      throw err;
    }
  }

  async getCurrentSession(caller?: string): Promise<Session | null> {
    if (typeof window === 'undefined') return null;
    const sessionId = localStorage.getItem(this.CURRENT_SESSION_KEY);
    if (sessionId) {
      try {
        // Get caller info if not provided
        if (!caller && typeof Error !== 'undefined') {
          try {
            const stack = new Error().stack;
            if (stack) {
              const lines = stack.split('\n');
              for (let i = 2; i < Math.min(lines.length, 5); i++) {
                const line = lines[i];
                const match = line.match(/at\s+(\w+)/) || line.match(/at\s+.*?\.(\w+)/);
                if (match && !match[1].includes('getCurrentSession')) {
                  caller = match[1];
                  break;
                }
              }
            }
          } catch (e) {
            // Ignore
          }
        }
        const session = await this.queries.getSession(sessionId, caller || 'getCurrentSession');
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

  async getActiveSessions(caller?: string): Promise<Session[]> {
    return this.queries.getActiveSessions(caller);
  }

  async getWaitingSessions(): Promise<Session[]> {
    return this.queries.getWaitingSessions();
  }

  async getMessages(sessionId: string): Promise<Message[]> {
    return this.queries.getMessages(sessionId);
  }

  async getSessionsWithIPs(): Promise<Array<{ id: string; ipAddress: string | null; userId: string; mode: string; status: string; createdAt: number; lastActivity: number; messageCount: number }>> {
    return this.queries.getSessionsWithIPs();
  }

  // Mutation methods - delegate to SessionMutations
  async createSession(mode: SessionMode, userId: string = 'default-user', researcherId?: string, version?: string): Promise<Session> {
    return this.mutations.createSession(mode, userId, researcherId, version);
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
    return this.mutations.updateSession(sessionId, updates);
  }

  async addMessage(
    sessionId: string,
    sender: MessageRole,
    content: string,
    metadata?: Message['metadata']
  ): Promise<Message | null> {
    return this.mutations.addMessage(sessionId, sender, content, metadata);
  }

  async sendHeartbeat(sessionId: string): Promise<void> {
    return this.mutations.sendHeartbeat(sessionId);
  }

  /**
   * Start a shared heartbeat for a session in this runtime.
   * Ensures only one timer per sessionId; returns a stop function.
   */
  startHeartbeat(sessionId: string, intervalMs: number = 5000): () => void {
    const controllers = SessionManager.heartbeatControllers;
    const existing = controllers.get(sessionId);
    if (existing) {
      existing.refCount += 1;
      // If a shorter interval is requested, update interval and timer
      if (intervalMs < existing.intervalMs) {
        clearInterval(existing.timerId);
        existing.intervalMs = intervalMs;
        existing.timerId = setInterval(() => this.runHeartbeat(sessionId), intervalMs);
      }
      return () => this.stopHeartbeat(sessionId);
    }

    const controller = {
      timerId: setInterval(() => this.runHeartbeat(sessionId), intervalMs),
      lastSent: 0,
      inFlight: false,
      refCount: 1,
      intervalMs,
    };

    controllers.set(sessionId, controller);
    // send immediately
    this.runHeartbeat(sessionId, true);

    return () => this.stopHeartbeat(sessionId);
  }

  /**
   * Stop a shared heartbeat; only clears when refCount hits zero.
   */
  stopHeartbeat(sessionId: string) {
    const controllers = SessionManager.heartbeatControllers;
    const entry = controllers.get(sessionId);
    if (!entry) return;
    entry.refCount = Math.max(0, entry.refCount - 1);
    if (entry.refCount === 0) {
      clearInterval(entry.timerId);
      controllers.delete(sessionId);
    }
  }

  private async runHeartbeat(sessionId: string, immediate: boolean = false) {
    const controllers = SessionManager.heartbeatControllers;
    const c = controllers.get(sessionId);
    if (!c || c.inFlight) return;
    const now = Date.now();
    if (!immediate && now - c.lastSent < c.intervalMs - 100) return;
    c.inFlight = true;
    try {
      await this.sendHeartbeat(sessionId);
      c.lastSent = Date.now();
    } catch {
      // silent
    } finally {
      c.inFlight = false;
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const result = await this.mutations.deleteSession(sessionId);
    // Clear current session if deleted
    const current = await this.getCurrentSession();
    if (current?.id === sessionId) {
      this.setCurrentSession(null);
    }
    return result;
  }

  async clearAllSessions(): Promise<boolean> {
    return this.mutations.clearAllSessions();
  }

  async deleteSessionsByIP(ipAddress: string): Promise<{ deleted_count: number; message: string }> {
    return this.mutations.deleteSessionsByIP(ipAddress);
  }

  // Subscription methods - delegate to SessionSubscriptions
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
