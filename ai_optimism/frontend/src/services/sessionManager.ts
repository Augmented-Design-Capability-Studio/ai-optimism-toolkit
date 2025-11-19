/**
 * Local session manager for wizard-of-oz mode
 * Uses localStorage for local development, easy to swap to API calls later
 */

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
  messages: Message[];
  isResearcherTyping?: boolean;
  isAIResponding?: boolean;
}

class SessionManager {
  private readonly SESSIONS_KEY = 'wizard_sessions';
  private readonly CURRENT_SESSION_KEY = 'wizard_current_session';
  
  // Generate unique ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get all sessions
  getSessions(): Session[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  }

  // Save sessions
  private saveSessions(sessions: Session[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));
  }

  // Get single session
  getSession(sessionId: string): Session | null {
    const sessions = this.getSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  // Create new session
  createSession(mode: SessionMode, userId: string = 'default-user'): Session {
    const session: Session = {
      id: this.generateId(),
      mode,
      status: 'active',
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };

    const sessions = this.getSessions();
    sessions.push(session);
    this.saveSessions(sessions);
    
    // Set as current session
    this.setCurrentSession(session.id);
    
    return session;
  }

  // Update session
  updateSession(sessionId: string, updates: Partial<Session>): Session | null {
    const sessions = this.getSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    
    if (index === -1) return null;
    
    sessions[index] = {
      ...sessions[index],
      ...updates,
      updatedAt: Date.now(),
    };
    
    this.saveSessions(sessions);
    return sessions[index];
  }

  // Set researcher typing indicator
  setResearcherTyping(sessionId: string, isTyping: boolean): void {
    const session = this.getSession(sessionId);
    if (!session) return;
    
    this.updateSession(sessionId, { isResearcherTyping: isTyping });
  }

  // Add message to session
  addMessage(
    sessionId: string,
    sender: MessageRole,
    content: string,
    metadata?: Message['metadata']
  ): Message | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    const message: Message = {
      id: this.generateId(),
      sessionId,
      sender,
      content,
      timestamp: Date.now(),
      metadata,
    };

    session.messages.push(message);
    session.updatedAt = Date.now();
    
    // Update status based on context
    if (sender === 'user' && session.mode === 'experimental') {
      session.status = 'waiting';
    } else if (sender === 'researcher') {
      session.status = 'active';
    }
    
    this.updateSession(sessionId, session);
    
    return message;
  }

  // Get messages for session
  getMessages(sessionId: string): Message[] {
    const session = this.getSession(sessionId);
    return session?.messages || [];
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
  getCurrentSession(): Session | null {
    if (typeof window === 'undefined') return null;
    const sessionId = localStorage.getItem(this.CURRENT_SESSION_KEY);
    return sessionId ? this.getSession(sessionId) : null;
  }

  // Get active sessions (for researcher dashboard)
  // Note: Returns all sessions including completed ones
  // Researcher must explicitly delete to remove from list
  getActiveSessions(): Session[] {
    return this.getSessions();
  }

  // Get sessions waiting for researcher
  getWaitingSessions(): Session[] {
    return this.getSessions().filter(s => s.status === 'waiting');
  }

  // Delete session
  deleteSession(sessionId: string): boolean {
    const sessions = this.getSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    
    if (filtered.length === sessions.length) return false;
    
    this.saveSessions(filtered);
    
    // Clear current session if deleted
    const current = localStorage.getItem(this.CURRENT_SESSION_KEY);
    if (current === sessionId) {
      this.setCurrentSession(null);
    }
    
    return true;
  }

  // Clear all sessions (for testing)
  clearAllSessions(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.SESSIONS_KEY);
    localStorage.removeItem(this.CURRENT_SESSION_KEY);
  }

  // Subscribe to session updates (simple polling for local mode)
  subscribeToSession(
    sessionId: string,
    callback: (session: Session) => void,
    intervalMs: number = 1000
  ): () => void {
    let lastUpdate = 0;
    
    const checkUpdates = () => {
      const session = this.getSession(sessionId);
      if (session && session.updatedAt > lastUpdate) {
        lastUpdate = session.updatedAt;
        callback(session);
      }
    };
    
    const intervalId = setInterval(checkUpdates, intervalMs);
    
    // Return cleanup function
    return () => clearInterval(intervalId);
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
