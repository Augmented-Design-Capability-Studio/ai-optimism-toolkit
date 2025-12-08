'use client';

import { Alert, Container, Box } from '@mui/material';
import { useState } from 'react';
import { useSessionManager } from '../../src/core/services/sessionManager';
import {
  useResearcherSessions,
  DashboardHeader,
  NewSessionAlert,
  SessionList,
  SessionDetail,
} from '../../src/researcher';
import { ResearcherAuthWrapper } from '../../src/researcher/ResearcherAuthWrapper';
import { BackendSettings } from '../../src/core/components/status/BackendSettings';

export default function ResearcherDashboard() {
  const [backendSettingsOpen, setBackendSettingsOpen] = useState(false);
  const sessionManager = useSessionManager();
  const {
    sessions,
    selectedSession,
    setSelectedSession,
    isFormalizingId,
    newSessionIds,
    waitingCount,
    loadSessions,
    handleTerminateSession,
    handleDeleteSession,
    handleFormalizeProblem,
    handleModeToggle,
    handleAIConfigUpdate,
  } = useResearcherSessions();

  // Handle sending message
  const handleSendMessage = async (sessionId: string, message: string, metadata?: any) => {
    await sessionManager.addMessage(sessionId, 'researcher', message, metadata);
    // Set status back to active since we've responded
    await sessionManager.updateSession(sessionId, { status: 'active' });
    
    // Immediately refresh the selected session to show the new message
    if (selectedSession?.id === sessionId) {
      try {
        const updatedSession = await sessionManager.getSession(sessionId);
        if (updatedSession) {
          setSelectedSession(updatedSession);
        }
      } catch (error) {
        console.warn('[ResearcherDashboard] Could not immediately refresh session after sending message:', error);
      }
    }
    
    // Also refresh the sessions list (but don't wait for it)
    loadSessions();
  };

  // Handle requesting AI response on client's behalf
  const handleRequestAIResponse = async (sessionId: string) => {
    try {
      // Call the API endpoint to generate AI response
      const response = await fetch(`/api/sessions/${sessionId}/ai-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate AI response');
      }

      const data = await response.json();
      const aiResponseText = data.response;

      if (!aiResponseText) {
        throw new Error('No response received from AI');
      }

      // Save the AI response to backend as an 'ai' sender message
      await sessionManager.addMessage(sessionId, 'ai', aiResponseText);
      
      // Update session status to active if it was waiting
      const currentSession = sessions.find(s => s.id === sessionId);
      if (currentSession?.status === 'waiting') {
        await sessionManager.updateSession(sessionId, { status: 'active' });
      }

      // Refresh sessions to show the new message
      await loadSessions();
    } catch (error: any) {
      console.error('[ResearcherDashboard] Error requesting AI response:', error);
      alert(`Failed to generate AI response: ${error.message || 'Unknown error'}`);
      throw error;
    }
  };

  // Handle clear all sessions
  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete ALL sessions? This cannot be undone.')) {
      return;
    }
    
    const success = await sessionManager.clearAllSessions();
    if (success) {
      setSelectedSession(null);
      await loadSessions();
      alert('All sessions have been cleared.');
    } else {
      alert('Failed to clear sessions. Please check the console for details.');
    }
  };

  // Handle delete sessions by IP
  const handleDeleteByIP = async () => {
    const ipAddress = prompt('Enter IP address to delete sessions from (e.g., 67.7.145.37):');
    if (!ipAddress || !ipAddress.trim()) {
      return;
    }

    if (!confirm(`Are you sure you want to delete ALL sessions from IP address ${ipAddress}? This cannot be undone.`)) {
      return;
    }

    try {
      const result = await sessionManager.deleteSessionsByIP(ipAddress.trim());
      alert(result.message || `Deleted ${result.deleted_count} session(s) from IP ${ipAddress}`);
      await loadSessions();
      if (selectedSession && selectedSession.ipAddress === ipAddress.trim()) {
        setSelectedSession(null);
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to delete sessions by IP';
      alert(`Error: ${errorMessage}`);
    }
  };

  return (
    <ResearcherAuthWrapper>
      {(handleLogout) => (
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <DashboardHeader 
            onRefresh={loadSessions} 
            onLogout={handleLogout}
            onClearAll={handleClearAll}
            onDeleteByIP={handleDeleteByIP}
            onBackendSettings={() => setBackendSettingsOpen(true)}
          />

          <NewSessionAlert show={newSessionIds.size > 0} />

          {waitingCount > 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              {waitingCount} session{waitingCount > 1 ? 's' : ''} waiting for your response
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 200px)' }}>
            <SessionList
              sessions={sessions}
              selectedSession={selectedSession}
              onSelectSession={setSelectedSession}
              newSessionIds={newSessionIds}
            />

            <SessionDetail
              session={selectedSession}
              isFormalizingId={isFormalizingId}
              onModeToggle={handleModeToggle}
              onFormalize={handleFormalizeProblem}
              onTerminate={handleTerminateSession}
              onDelete={handleDeleteSession}
              onSendMessage={handleSendMessage}
              onRequestAIResponse={handleRequestAIResponse}
              onRefresh={loadSessions}
              onAIConfigUpdate={handleAIConfigUpdate}
            />
          </Box>
          
          <BackendSettings 
            open={backendSettingsOpen} 
            onClose={() => setBackendSettingsOpen(false)} 
          />
        </Container>
      )}
    </ResearcherAuthWrapper>
  );
}
