import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { 
  CHAT_SYSTEM_PROMPT, 
  RESEARCHER_DRAFT_FORMAT_SYSTEM_APPENDIX,
  getDraftFormattingPrompt 
} from '@/core/config/prompts';
import type { Message } from '@/core/services/sessionManager';

export const runtime = 'edge';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Parse request body - may include draft, messages, or both
    let requestBody: { draft?: string; messages?: Message[] } = {};
    try {
      requestBody = await request.json();
    } catch {
      // If no body or invalid JSON, continue with empty object
      requestBody = {};
    }
    
    // Get backend URL from environment variable
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const baseUrl = `${backendUrl}/api`;
    
    // Get AI config for the session
    let aiConfig;
    try {
      const configResponse = await fetch(`${baseUrl}/sessions/${sessionId}/ai-config/key`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (configResponse.status === 404) {
        return NextResponse.json(
          { error: 'AI provider not configured for this session' },
          { status: 400 }
        );
      }
      
      if (!configResponse.ok) {
        throw new Error(`Failed to fetch AI config: ${configResponse.statusText}`);
      }
      
      aiConfig = await configResponse.json();
    } catch (error: any) {
      console.error('[AI Response API] Error fetching AI config:', error);
      return NextResponse.json(
        { error: 'Failed to fetch AI configuration' },
        { status: 500 }
      );
    }

    if (!aiConfig || !aiConfig.apiKey) {
      return NextResponse.json(
        { error: 'AI provider not configured for this session' },
        { status: 400 }
      );
    }

    // Create Google provider with session's API key
    const google = createGoogleGenerativeAI({
      apiKey: aiConfig.apiKey,
    });
    
    const model = google(aiConfig.model || 'gemini-2.5-flash');

    // Get session system prompt (or use default) - fetch once for both draft and regular generation
    let baseSystemPrompt = CHAT_SYSTEM_PROMPT;
    try {
      const sessionResponse = await fetch(`${baseUrl}/sessions/${sessionId}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (sessionResponse.ok) {
        const session = await sessionResponse.json();
        if (session.systemPrompt) {
          baseSystemPrompt = session.systemPrompt;
        }
      }
    } catch (error) {
      console.warn('[AI Response API] Could not fetch session system prompt, using default:', error);
    }

    // If draft is provided, format/improve it instead of generating from conversation
    if (requestBody.draft && requestBody.draft.trim()) {
      console.log('[AI Response API] Formatting draft text for session:', sessionId);
      
      // Get conversation context from provided messages or fetch from backend
      let conversationContext = '';
      if (requestBody.messages && requestBody.messages.length > 0) {
        // Use provided messages (already filtered by frontend)
        const recentMessages = requestBody.messages.slice(-6);
        conversationContext = recentMessages
          .map((msg) => `${msg.sender === 'user' ? 'User' : msg.sender === 'researcher' ? 'Researcher' : 'AI'}: ${msg.content}`)
          .join('\n');
      } else {
        // Fallback: fetch from backend (for backward compatibility)
        try {
          const messagesResponse = await fetch(`${baseUrl}/sessions/${sessionId}/messages`, {
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (messagesResponse.ok) {
            const sessionMessages = await messagesResponse.json();
            const recentMessages = sessionMessages.slice(-6);
            conversationContext = recentMessages
              .map((msg: any) => `${msg.sender === 'user' ? 'User' : msg.sender === 'researcher' ? 'Researcher' : 'AI'}: ${msg.content}`)
              .join('\n');
          }
        } catch (error) {
          console.warn('[AI Response API] Could not fetch conversation context:', error);
        }
      }

      const formatPrompt = getDraftFormattingPrompt(requestBody.draft, conversationContext);
      const researcherFormatSystemPrompt = `${baseSystemPrompt}${RESEARCHER_DRAFT_FORMAT_SYSTEM_APPENDIX}`;

      const { text } = await generateText({
        model,
        messages: [{ role: 'user', content: formatPrompt }],
        system: researcherFormatSystemPrompt,
      });

      console.log('[AI Response API] Formatted draft length:', text.length);
      return NextResponse.json({ response: text });
    }

    // Otherwise, generate from conversation
    // Use provided messages (already filtered by frontend) or fetch from backend
    let sessionMessages: Message[] = [];
    
    if (requestBody.messages && requestBody.messages.length > 0) {
      // Use provided messages (already filtered by frontend)
      sessionMessages = requestBody.messages;
    } else {
      // Fallback: fetch from backend (for backward compatibility)
      const messagesResponse = await fetch(`${baseUrl}/sessions/${sessionId}/messages`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!messagesResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch session messages' },
          { status: messagesResponse.status }
        );
      }
      
      sessionMessages = await messagesResponse.json();
    }

    // Find the last user message - only include messages up to and including it
    // This ensures we're requesting a response to the user's message, not to an existing AI response
    let lastUserMessageIndex = -1;
    for (let i = sessionMessages.length - 1; i >= 0; i--) {
      if (sessionMessages[i].sender === 'user') {
        lastUserMessageIndex = i;
        break;
      }
    }

    // If no user message found, return error
    if (lastUserMessageIndex === -1) {
      return NextResponse.json(
        { error: 'No user message found in conversation' },
        { status: 400 }
      );
    }

    // Only include messages up to the last user message
    const messagesToInclude = sessionMessages.slice(0, lastUserMessageIndex + 1);

    // Convert session messages to AI SDK format
    const aiMessages = messagesToInclude.map((msg) => {
      const role = msg.sender === 'user' ? 'user' : msg.sender === 'researcher' ? 'assistant' : 'assistant';
      return {
        role,
        content: msg.content,
      };
    });
    
    console.log('[AI Response API] Generating AI response for session:', sessionId, {
      messageCount: aiMessages.length,
      provider: aiConfig.provider,
      model: aiConfig.model,
    });

    // Generate AI response (non-streaming) - use baseSystemPrompt already fetched above
    const { text } = await generateText({
      model,
      messages: aiMessages,
      system: baseSystemPrompt,
    });

    console.log('[AI Response API] Generated response length:', text.length);

    return NextResponse.json({ 
      response: text 
    });
  } catch (error) {
    console.error('[AI Response API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to generate AI response', 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

