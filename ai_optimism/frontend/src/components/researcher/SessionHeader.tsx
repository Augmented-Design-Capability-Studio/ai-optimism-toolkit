/**
 * Session detail panel with header controls
 */

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
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Session, sessionManager } from '../../services/sessionManager';

interface SessionHeaderProps {
  session: Session;
  isFormalizingId: string | null;
  onModeToggle: (sessionId: string, mode: 'ai' | 'experimental') => void;
  onFormalize: (sessionId: string) => void;
  onTerminate: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

export function SessionHeader({
  session,
  isFormalizingId,
  onModeToggle,
  onFormalize,
  onTerminate,
  onDelete,
}: SessionHeaderProps) {
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

  const handleResetFormalization = () => {
    if (window.confirm('Reset formalization status to allow re-formalization?')) {
      sessionManager.updateSession(session.id, { status: 'active' });
      // Force immediate UI update by triggering parent's loadSessions
      // The onModeToggle function will call loadSessions which refreshes the UI
      setTimeout(() => {
        onModeToggle(session.id, session.mode);
      }, 0);
    }
  };

  return (
    <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
      {/* Session Info */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Session {session.id.slice(-8)}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary">
            Created: {new Date(session.createdAt).toLocaleString()}
          </Typography>
          <span>•</span>
          <Typography variant="caption" color="text.secondary">
            Updated: {new Date(session.updatedAt).toLocaleString()}
          </Typography>
          <Chip
            label={session.status.charAt(0).toUpperCase() + session.status.slice(1)}
            size="small"
            color={
              session.status === 'completed' ? 'default' :
                session.status === 'formalized' ? 'success' :
                  session.status === 'waiting' ? 'warning' : 'primary'
            }
          />
        </Box>
      </Box>

      {/* Controls Row */}
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Mode Toggle */}
        <Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            User sees:
          </Typography>
          <ToggleButtonGroup
            value={session.mode}
            exclusive
            onChange={(_, newMode) => {
              if (newMode !== null) {
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
              <ToggleButton value="ai">
                🤖 AI Mode
              </ToggleButton>
            </Tooltip>
            <Tooltip
              title="Wizard-of-Oz mode: You manually craft each response as the researcher. User believes they're chatting with AI. Switch to AI Mode anytime to let the AI respond automatically."
              arrow
              placement="top"
            >
              <ToggleButton value="experimental">
                🧪 Experimental
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

        {/* Formalization Button */}
        <Button
          variant="contained"
          color={session.status === 'formalized' ? 'warning' : 'secondary'}
          size="small"
          startIcon={
            isFormalizingId === session.id ? undefined :
              session.status === 'formalized' ? <RefreshIcon /> : <AutoFixHighIcon />
          }
          onClick={session.status === 'formalized' ? handleResetFormalization : () => onFormalize(session.id)}
          disabled={
            isFormalizingId === session.id ||
            session.messages.length < 2
          }
        >
          {isFormalizingId === session.id
            ? 'Formalizing...'
            : session.status === 'formalized'
              ? 'Reset Formalization'
              : 'Formalize Problem'}
        </Button>

        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

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
            onClick={() => onTerminate(session.id)}
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
            onClick={() => onDelete(session.id)}
            title="Permanently delete session from records - User unaffected, automatically gets new session"
          >
            Delete
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
