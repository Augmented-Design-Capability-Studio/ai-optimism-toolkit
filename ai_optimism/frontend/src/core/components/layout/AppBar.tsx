'use client';

import { Box, AppBar as MuiAppBar, Toolbar, Typography, Button, IconButton, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { SessionAIStatusIndicator, SessionAISettings, BackendStatusIndicator, BackendSettings } from '../status';
import { Session, useSessionManager } from '../../services/sessionManager';
import type { AISessionConfigStatus } from '../../services/sessionManager';
import { getAIConfig } from '../../services/sessionAIConfig';
import { useState, useEffect } from 'react';

interface AppBarProps {
  title: string;
  color?: string;
  currentSession?: Session | null;
  onLogout: () => void;
  onAIConfigUpdate?: (sessionId: string, aiConfig: AISessionConfigStatus | null) => void;
  onSessionChange?: (sessionId: string) => void;
}

export function AppBar({ title, color = 'primary.main', currentSession, onLogout, onAIConfigUpdate, onSessionChange }: AppBarProps) {
  const router = useRouter();
  const sessionManager = useSessionManager();
  const [backendSettingsOpen, setBackendSettingsOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);

  // Load active sessions (excluding terminated/deleted)
  useEffect(() => {
    const loadActiveSessions = async () => {
      try {
        const allSessions = await sessionManager.getActiveSessions('AppBar');
        // Filter out terminated and deleted sessions
        const active = allSessions.filter(
          (s) => s.status !== 'completed' && s.status !== 'terminated'
        );
        setActiveSessions(active);
      } catch (error) {
        console.error('[AppBar] Failed to load active sessions:', error);
      }
    };
    
    loadActiveSessions();
    // Refresh every 5 seconds
    const interval = setInterval(loadActiveSessions, 5000);
    return () => clearInterval(interval);
  }, [sessionManager]);

  // Lightweight update: just refresh aiConfig, not the whole session
  const handleAIConfigChange = async () => {
    if (!currentSession?.id) return;
    try {
      const updatedConfig = await getAIConfig(currentSession.id);
      onAIConfigUpdate?.(currentSession.id, updatedConfig);
    } catch (error) {
      // If getAIConfig fails, the next session poll will pick it up
      console.warn('[AppBar] Could not immediately update AI config:', error);
      // Still notify parent that config might have changed (could be null now)
      onAIConfigUpdate?.(currentSession.id, null);
    }
  };

  const handleSessionSelect = async (sessionId: string) => {
    if (onSessionChange) {
      onSessionChange(sessionId);
    } else {
      // Fallback: set as current session via sessionManager
      await sessionManager.setCurrentSession(sessionId);
      // Reload the page to refresh the session
      window.location.reload();
    }
  };

  // Format session ID: show first 6 digits and last 7 characters (including dash)
  const formatSessionId = (sessionId: string): string => {
    if (sessionId.length <= 20) {
      return sessionId; // Show full ID if short enough
    }
    const firstPart = sessionId.substring(0, 6);
    const lastPart = sessionId.substring(sessionId.length - 7);
    return `${firstPart}...${lastPart}`;
  };

  return (
    <>
      <MuiAppBar 
        position="static" 
        sx={{ 
          flexShrink: 0, 
          width: '100vw',
          bgcolor: color,
          color: 'primary.contrastText',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => router.push('/')}
            sx={{ mr: 2 }}
            title="Back to Hub"
          >
            <HomeIcon />
          </IconButton>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5, py: 1 }}>
            {currentSession && (
              <>
                <SessionAIStatusIndicator 
                  sessionId={currentSession.id} 
                  mode={currentSession.mode}
                  aiConfig={currentSession.aiConfig}  // Use AI config from session (no separate polling needed)
                  onClick={() => setAiSettingsOpen(true)}
                />
                <SessionAISettings
                  open={aiSettingsOpen}
                  sessionId={currentSession.id}
                  aiConfig={currentSession.aiConfig}  // Use AI config from session (no separate API call needed)
                  onClose={() => setAiSettingsOpen(false)}
                  onConfigChange={handleAIConfigChange}  // Lightweight update after setting config
                />
              </>
            )}
            <BackendStatusIndicator onClick={() => setBackendSettingsOpen(true)} />
          </Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'white' }}>
            {title}
          </Typography>
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
            {currentSession && activeSessions.length > 0 && (
              <FormControl 
                size="small" 
                sx={{ 
                  minWidth: 200,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'white',
                  },
                  '& .MuiInputBase-input': {
                    color: 'white',
                  },
                  '& .MuiSvgIcon-root': {
                    color: 'white',
                  },
                }}
              >
                <Select
                  value={currentSession.id}
                  onChange={(e) => handleSessionSelect(e.target.value)}
                  displayEmpty
                  sx={{
                    color: 'white',
                    '& .MuiSelect-select': {
                      py: 1,
                    },
                  }}
                >
                  {activeSessions.map((session) => (
                    <MenuItem key={session.id} value={session.id}>
                      <Box>
                        <Typography variant="body2">
                          {formatSessionId(session.id)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          {session.status} • {session.messages?.length || 0} msgs
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {currentSession && activeSessions.length === 0 && (
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Session: {formatSessionId(currentSession.id)}
              </Typography>
            )}
            <Button
              variant="outlined"
              color="inherit"
              onClick={onLogout}
              sx={{ 
                color: 'white', 
                borderColor: 'rgba(255, 255, 255, 0.3)',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </MuiAppBar>
      <BackendSettings
        open={backendSettingsOpen}
        onClose={() => setBackendSettingsOpen(false)}
      />
    </>
  );
}

