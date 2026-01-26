# Researcher Dashboard Components

This directory contains modular components for the researcher dashboard interface.

## Structure

```
researcher/
├── index.ts                      # Barrel export
├── useResearcherSessions.ts      # Custom hook for session management
├── DashboardHeader.tsx           # Header with title and action buttons
├── NewSessionAlert.tsx           # New session notification banner
├── SessionList.tsx               # Sidebar showing all active sessions
├── SessionDetail.tsx             # Main panel combining header, messages, and input
├── SessionHeader.tsx             # Session control panel with mode toggle and actions
├── MessageList.tsx               # Message thread display
└── MessageInput.tsx              # Input area for researcher responses
```

## Component Hierarchy

```
ResearcherDashboard (page.tsx)
├── DashboardHeader
│   └── Refresh Button
├── NewSessionAlert
├── Waiting Sessions Alert
└── Main Layout (Flex Container)
    ├── SessionList
    │   └── SessionListItem[] (with status indicators)
    └── SessionDetail
        ├── SessionHeader
        │   ├── Session Info (ID, Status, Mode)
        │   ├── Mode Toggle (AI/Experimental)
        │   └── Formalize/Reset Toggle Button
        ├── MessageList
        │   ├── MessageBubble[] (user/researcher/ai)
        │   └── Expandable Formalization Messages
        └── MessageInput (conditional)
        └── Action Buttons (Terminate, Delete)
```

## Key Features

### useResearcherSessions Hook
- Session polling (2-second intervals)
- New session detection with notifications
- Session selection management
- CRUD operations (update, delete, terminate)
- Client-side formalization workflow using AI SDK
- Formalization validation and incomplete detection

### Session Actions

**Formalize/Reset Button** (Purple/Secondary when ready, Warning/Orange when resetting):
- **Formalize**: Triggers AI-based problem formalization
  - Uses versioned prompts from `src/clients/prompts`
  - Validates completeness of formalization
  - If incomplete: Shows amber warning bubble with "⚠️ Incomplete Formalization"
  - If complete: Shows green success bubble with "✨ Problem Formalized"
  - Sets session status to 'formalized' on success
- **Reset**: Returns session to 'active' status for re-formalization
- Toggle button changes based on current formalization state

**Terminate** (Orange/Warning):
- Ends session gracefully
- Sets status to 'completed'
- User sees notification: "Your previous session has ended. Starting a fresh conversation."
- Session data preserved for review
- Use case: Natural end of research session

**Delete** (Red/Error):
- Terminates session first (notifies user)
- Then permanently removes session from records
- Updated confirmation: "Permanently delete this session from records? This will terminate the session and cannot be undone."
- Use case: Cleanup old/test sessions

### Live Monitoring
- Real-time session updates via polling
- Visual indicators:
  - 🟢 Pulsing green dot for active sessions
  - "NEW" badge for recently created sessions (fades after 5 seconds)
  - Last message preview in session list
  - Status chips (Active, Waiting, Formalized, Completed)

### Formalization Messages
- **Complete Formalization**: 
  - Green border and "✨ Problem Formalized" chip
  - Expandable accordion with full formalization content
  - Success color (green) background
- **Incomplete Formalization**:
  - Amber/warning border and "⚠️ Incomplete Formalization" chip
  - Expandable accordion showing AI's explanation of missing info
  - Soft amber background (`rgba(255, 152, 0, 0.15)`)
  - Session remains 'active' to allow more conversation

### Mode Toggle
- **AI Mode**: Direct AI responses via configured provider
- **Experimental Mode**: Researcher-mediated responses (Wizard-of-Oz)
- Toggle visible to researcher only
- User sees seamless experience regardless of mode

## Usage Example

```tsx
import {
  useResearcherSessions,
  DashboardHeader,
  SessionList,
  SessionDetail,
} from '@/components/researcher';

function MyDashboard() {
  const {
    sessions,
    selectedSession,
    setSelectedSession,
    // ... other hooks
  } = useResearcherSessions();

  return (
    <Container>
      <DashboardHeader onCreateSession={...} onRefresh={...} />
      <SessionList sessions={sessions} onSelectSession={setSelectedSession} />
      <SessionDetail session={selectedSession} onSendMessage={...} />
    </Container>
  );
}
```

## Data Flow

1. **Session Creation**: User opens ChatPanel → auto-creates session
2. **Detection**: Polling detects new session → shows alert with NEW badge
3. **Monitoring**: Researcher selects session → sees live messages
4. **AI Readiness**: AI signals "enough information" → status changes to 'waiting'
5. **Interaction**: Researcher responds or toggles mode
6. **Formalization**: 
   - Researcher clicks "Formalize Problem" button
   - Client-side AI processes conversation using centralized prompts
   - Validates completeness (objectives, variables, constraints, criteria)
   - If incomplete: Shows amber warning message, keeps status 'active'
   - If complete: Shows green success message, sets status 'formalized'
7. **Re-formalization**: Click "Reset Formalization" → back to 'active' → refine → formalize again
8. **Termination**: Researcher ends session → user notified and gets fresh start
9. **Deletion**: Researcher deletes → terminates first → permanently removes

## Integration Points

- **sessionManager**: LocalStorage-based session management service
- **ChatPanel**: User-facing chat interface with AI readiness detection
- **AI Provider**: Google Gemini via AI SDK (client-side formalization)
- **Versioned Prompts**: `src/clients/prompts` for consistent AI behavior
  - `CHAT_SYSTEM_PROMPT`: Main chat assistant instructions
- `getFormalizationPromptByVersion()`: Problem formalization with validation
  - `isIncompleteFormalization()`: Helper to detect incomplete responses

## Future Enhancements

- WebSocket for real-time updates (replace polling)
- Export conversation transcripts
- Session analytics and metrics
- Multi-researcher support
- Session search and filtering
- Structured formalization editor
- Version history for re-formalized problems
