import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { CHAT_SYSTEM_PROMPT } from '../../../../../src/config/prompts';

export const runtime = 'edge';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
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

    // Get session messages from backend
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
    
    const sessionMessages = await messagesResponse.json();

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
    const aiMessages = messagesToInclude.map((msg: any) => {
      const role = msg.sender === 'user' ? 'user' : msg.sender === 'researcher' ? 'assistant' : 'assistant';
      return {
        role,
        content: msg.content,
      };
    });

    // Create Google provider with session's API key
    const google = createGoogleGenerativeAI({
      apiKey: aiConfig.apiKey,
    });
    
    const model = google(aiConfig.model || 'gemini-2.5-flash');
    
    console.log('[AI Response API] Generating AI response for session:', sessionId, {
      messageCount: aiMessages.length,
      provider: aiConfig.provider,
      model: aiConfig.model,
    });

    // Generate AI response (non-streaming)
    const { text } = await generateText({
      model,
      messages: aiMessages,
      system: CHAT_SYSTEM_PROMPT,
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

