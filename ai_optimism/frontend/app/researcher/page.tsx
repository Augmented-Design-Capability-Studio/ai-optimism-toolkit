'use client';

import { Alert, Container, Box } from '@mui/material';
import { sessionManager } from '../../src/services/sessionManager';
import {
  useResearcherSessions,
  DashboardHeader,
  NewSessionAlert,
  SessionList,
  SessionDetail,
} from '../../src/components/researcher';

export default function ResearcherDashboard() {
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
  const handleSendMessage = (sessionId: string, message: string) => {
    sessionManager.addMessage(sessionId, 'researcher', message);
    loadSessions();
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <DashboardHeader onRefresh={loadSessions} />

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
  );
}
