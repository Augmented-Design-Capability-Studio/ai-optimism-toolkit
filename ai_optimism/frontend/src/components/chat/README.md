# Chat Components

This directory contains modular components for the ChatPanel, organized by responsibility.

## Structure

```
chat/
├── index.ts                      # Exports all components
├── useChatSession.ts             # Hook: manages chat state and session logic (150 lines)
├── ChatHeader.tsx                # Component: mode indicator and status (56 lines)
├── MessagesList.tsx              # Component: scrollable messages container (62 lines)
├── MessageBubble.tsx             # Component: individual message with styling (179 lines)
├── WelcomeMessage.tsx            # Component: welcome messages for each mode (154 lines)
├── GenerateControlsButton.tsx   # Component: control generation button (73 lines)
├── ChatInput.tsx                 # Component: message input field (57 lines)
└── ConnectionWarning.tsx         # Component: API key warning banner (23 lines)
```

## Components

### `useChatSession` (Hook)
Manages all chat state and logic:
- Session initialization and subscription
- AI SDK integration (useChat)
- Message handling (AI vs Experimental mode)
- Auto-scrolling behavior
- Conversation extraction

**Returns:**
- `input`, `setInput` - Current input state
- `currentSession` - Active session object
- `mode` - Current mode ('ai' | 'experimental')
- `displayMessages` - Messages to render
- `isLoading` - Loading state
- `isWaitingForResearcher` - Waiting indicator
- `apiKey`, `provider`, `model` - AI provider config
- `handleSubmit` - Form submission handler
- `getConversationText` - Extract text for generation

### `ChatHeader`
Displays chat title, mode indicator, and waiting status.

**Props:**
- `mode` - Current session mode
- `isWaitingForResearcher` - Show waiting chip

### `MessagesList`
Renders scrollable message list with welcome messages and loading indicator.

**Props:**
- `messages` - Array of messages to display
- `mode` - Current mode (affects rendering)
- `apiKey` - For showing connection prompt
- `isLoading` - Show "thinking" indicator
- `messagesEndRef` - Ref for auto-scrolling

### `MessageBubble`
Renders individual message with proper styling, avatars, and markdown support.

**Props:**
- `message` - Message object (supports AI SDK and session formats)
- `mode` - Affects text extraction logic

**Features:**
- Markdown rendering for assistant messages
- Formalization badge for special messages
- Role-based styling and avatars
- Supports multiple message formats

### `WelcomeMessage`
Context-aware welcome messages for different states.

**Props:**
- `mode` - Current mode
- `apiKey` - Determines which welcome to show

**States:**
- No API key (AI mode) → Connection prompt
- AI mode with key → Standard welcome
- Experimental mode → Modified welcome (hides researcher)

### `GenerateControlsButton`
Control panel generation button with smart state management.

**Props:**
- `displayMessagesLength` - Show only if messages exist
- `mode` - Affects button behavior
- `apiKey` - Required for AI mode
- `currentSession` - Check for formalization
- `isGenerating` - Loading state
- `isLoading` - Disable while streaming
- `onGenerate` - Generation callback

**States:**
- AI mode: Generate from conversation
- Experimental mode (no formalization): Show "Analyzing..."
- Experimental mode (formalized): Ready to generate

### `ChatInput`
Message input field with send button.

**Props:**
- `input` - Current value
- `onInputChange` - Change handler
- `onSubmit` - Form submission
- `isLoading` - Disable during operations
- `mode` - Affects placeholder text
- `apiKey` - Required for AI mode

### `ConnectionWarning`
Bottom banner warning when API key is missing.

**Props:**
- `apiKey` - Show warning if null
- `mode` - Only show in AI mode

## Usage

```tsx
import { ChatPanel } from './components/ChatPanel';

// In parent component
<ChatPanel onControlsGenerated={(controls) => {
  // Handle generated controls
}} />
```

## Benefits of This Structure

1. **Separation of Concerns**: Each component has a single responsibility
2. **Reusability**: Components can be used independently
3. **Testability**: Easier to unit test small components
4. **Maintainability**: Changes are isolated to specific files
5. **Readability**: Main ChatPanel is now ~145 lines vs 678 lines
6. **Type Safety**: Clear interfaces for all props

## Comparison

**Before:** 678 lines in single file
**After:** 
- ChatPanel: 145 lines (main orchestrator)
- 8 modular components: 762 lines total
- Better organized, easier to maintain
