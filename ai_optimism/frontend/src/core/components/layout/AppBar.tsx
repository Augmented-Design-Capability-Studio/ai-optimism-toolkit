'use client';

import { Box, AppBar as MuiAppBar, Toolbar, Typography, Button, IconButton } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { SessionAIStatusIndicator, SessionAISettings, BackendStatusIndicator, BackendSettings } from '../status';
import { Session } from '../../services/sessionManager';
import { useState } from 'react';

interface AppBarProps {
  title: string;
  color?: string;
  currentSession?: Session | null;
  onLogout: () => void;
}

export function AppBar({ title, color = 'primary.main', currentSession, onLogout }: AppBarProps) {
  const router = useRouter();
  const [backendSettingsOpen, setBackendSettingsOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);

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
                  onClick={() => setAiSettingsOpen(true)}
                />
                <SessionAISettings
                  open={aiSettingsOpen}
                  sessionId={currentSession.id}
                  onClose={() => setAiSettingsOpen(false)}
                />
              </>
            )}
            <BackendStatusIndicator onClick={() => setBackendSettingsOpen(true)} />
          </Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'white' }}>
            {title}
          </Typography>
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
            {currentSession && (
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Session: {currentSession.id}
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

