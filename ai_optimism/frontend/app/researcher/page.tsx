'use client';

import { Alert, Container, Box } from '@mui/material';
import { useSessionManager } from '../../src/services/sessionManager';
import {
  useResearcherSessions,
  DashboardHeader,
  NewSessionAlert,
  SessionList,
  SessionDetail,
} from '../../src/components/researcher';
import { ResearcherAuthWrapper } from '../../src/components/researcher/ResearcherAuthWrapper';

export default function ResearcherDashboard() {
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
  } = useResearcherSessions();

  // Handle sending message
  const handleSendMessage = async (sessionId: string, message: string) => {
    await sessionManager.addMessage(sessionId, 'researcher', message);
    // Set status back to active since we've responded
    await sessionManager.updateSession(sessionId, { status: 'active' });
    await loadSessions();
  };

  return (
    <ResearcherAuthWrapper>
      {(handleLogout) => (
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <DashboardHeader onRefresh={loadSessions} onLogout={handleLogout} />

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
            />
          </Box>
        </Container>
      )}
    </ResearcherAuthWrapper>
  );
}
