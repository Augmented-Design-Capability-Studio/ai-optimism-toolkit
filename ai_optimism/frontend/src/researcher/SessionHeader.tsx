/**
 * Session detail panel with header controls
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Tooltip,
} from '@mui/material';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ScienceIcon from '@mui/icons-material/Science';
import EditIcon from '@mui/icons-material/Edit';
import { Session, useSessionManager } from '../core/services/sessionManager';
import { SessionAIStatusIndicator, SessionAISettings } from '../core/components/status';

interface SessionHeaderProps {
  session: Session;
  isFormalizingId: string | null;
  onModeToggle: (sessionId: string, mode: 'ai' | 'experimental') => void;
  onTerminate: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onEditSystemPrompt?: (sessionId: string) => void;
}

export function SessionHeader({
  session,
  isFormalizingId,
  onModeToggle,
  onTerminate,
  onDelete,
  onEditSystemPrompt,
}: SessionHeaderProps) {
  const sessionManager = useSessionManager();
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const handleExport = () => {
    // Generate chat log text
    const header = `Chat Session: ${session.id}\nCreated: ${new Date(session.createdAt).toLocaleString()}\nStatus: ${session.status}\nMode: ${session.mode}\n${'='.repeat(80)}\n\n`;

    const messagesText = session.messages.map(msg => {
      const timestamp = new Date(msg.timestamp).toLocaleTimeString();
      const sender = msg.sender === 'user' ? 'User' : msg.sender === 'researcher' ? 'Researcher' : 'AI';
      return `[${timestamp}] ${sender}:\n${msg.content}\n`;
    }).join('\n');

    const content = header + messagesText;

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-session-${session.id.slice(-8)}-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  return (
    <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
      {/* Session Info */}
      <Box sx={{ mb: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" fontWeight="medium">
            Session {session.id.slice(-8)}
          </Typography>
          {session.ipAddress && (
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                IP: {session.ipAddress}
              </Typography>
            )}
          <Chip
            label={session.status.charAt(0).toUpperCase() + session.status.slice(1)}
            size="small"
            color={
              session.status === 'completed' ? 'default' :
                session.status === 'formalized' ? 'success' :
                  session.status === 'waiting' ? 'warning' : 'primary'
            }
          />
          <Chip
            label={Date.now() - session.lastActivity < 25000 ? 'Connected' : 'Disconnected'}
            size="small"
            color={Date.now() - session.lastActivity < 25000 ? 'success' : 'default'}
            variant={Date.now() - session.lastActivity < 25000 ? 'filled' : 'outlined'}
            title={Date.now() - session.lastActivity < 25000 
              ? 'Client window/tab is open and connected' 
              : 'Client window/tab appears to be closed (no heartbeat received)'}
          />
          </Box>
          <SessionAIStatusIndicator 
            sessionId={session.id} 
            mode={session.mode}
            onClick={() => setAiSettingsOpen(true)}
          />
          <SessionAISettings
            open={aiSettingsOpen}
            sessionId={session.id}
            onClose={() => setAiSettingsOpen(false)}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary">
            Created: {new Date(session.createdAt).toLocaleString()}
          </Typography>
          <span>•</span>
          <Typography variant="caption" color="text.secondary">
            Updated: {new Date(session.updatedAt).toLocaleString()}
          </Typography>
        </Box>
      </Box>

      {/* Controls Row */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Mode Toggle */}
        <Box>
          <ToggleButtonGroup
            value={session.mode}
            exclusive
            onChange={(_, newMode) => {
              if (newMode !== null) {
                // Backend-routed: Mode toggle updates session through backend API
                // This ensures mode changes are synced across all devices
                onModeToggle(session.id, newMode);
              }
            }}
            size="small"
          >
            <Tooltip
              title="Direct AI responses using configured provider (Google Gemini). User receives automated AI assistance. You can still send messages as researcher if needed."
              arrow
              placement="top"
            >
              <ToggleButton value="ai" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SmartToyIcon sx={{ fontSize: 18 }} />
                AI Mode
              </ToggleButton>
            </Tooltip>
            <Tooltip
              title="Wizard-of-Oz mode: You manually craft each response as the researcher. User believes they're chatting with AI. Switch to AI Mode anytime to let the AI respond automatically."
              arrow
              placement="top"
            >
              <ToggleButton value="experimental" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ScienceIcon sx={{ fontSize: 18 }} />
                Experimental
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

        {/* Edit System Prompt Button */}
        {onEditSystemPrompt && (
          <>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => onEditSystemPrompt(session.id)}
              title="Edit Master Prompt"
              sx={{
                borderColor: 'purple',
                color: 'purple',
                '&:hover': {
                  borderColor: 'purple',
                  backgroundColor: 'rgba(128, 0, 128, 0.04)',
                },
              }}
            >
              PROMPT
            </Button>
            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
          </>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            color="info"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            title="Export chat log as text file"
          >
            Export
          </Button>
          <Button
            variant="outlined"
            color="warning"
            size="small"
            startIcon={<StopIcon />}
            onClick={() => {
              // Backend-routed: Terminate updates session status through backend API
              // This ensures termination is synced across all devices
              onTerminate(session.id);
            }}
            disabled={session.status === 'completed'}
            title="End session gracefully - User sees 'session has ended' notification and gets a fresh start"
          >
            Terminate
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<DeleteIcon />}
            onClick={() => {
              // Backend-routed: Delete removes session through backend API
              // This ensures deletion is synced across all devices
              onDelete(session.id);
            }}
            title="Permanently delete session from records - User connection unaffected, no new session created"
          >
            Force Delete
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
