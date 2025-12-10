import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, convertToCoreMessages } from 'ai';
import { CHAT_SYSTEM_PROMPT } from '../../../src/core/config/prompts';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, sessionId, provider = 'google', model: modelName = 'gemini-2.5-flash-lite' } = body;
    
    console.log('[Chat API] Request received:', { 
      hasSessionId: !!sessionId,
      sessionId,
      provider, 
      model: modelName,
      messageCount: messages?.length,
      messageRoles: messages?.map((m: any) => m.role),
    });
    
    // Handle empty requests (common on page load)
    if (!messages || messages.length === 0) {
      console.log('[Chat API] No messages provided (initial load - returning empty response)');
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('0:""\n'));
          controller.close();
        }
      });
      return new Response(stream, {
        headers: { 
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }
    
    // Validate sessionId
    if (!sessionId) {
      console.error('[Chat API] No sessionId provided for', messages.length, 'messages');
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const errorMsg = 'Session ID required. Please ensure you have an active session.';
          controller.enqueue(encoder.encode(`0:"${errorMsg.replace(/"/g, '\\"')}"\n`));
          controller.close();
        }
      });
      return new Response(stream, {
        status: 200, // Return 200 to prevent error handling in useChat
        headers: { 
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }
    
    // Get backend URL from environment variable
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const baseUrl = `${backendUrl}/api`;
    
    // Fetch AI config (including decrypted API key) from backend
    let aiConfig;
    try {
      const configResponse = await fetch(`${baseUrl}/sessions/${sessionId}/ai-config/key`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (configResponse.status === 404) {
        console.error('[Chat API] AI config not found for session:', sessionId);
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            const errorMsg = 'AI provider not configured for this session. Please configure your AI provider settings.';
            controller.enqueue(encoder.encode(`0:"${errorMsg.replace(/"/g, '\\"')}"\n`));
            controller.close();
          }
        });
        return new Response(stream, {
          status: 200,
          headers: { 
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
          },
        });
      }
      
      if (!configResponse.ok) {
        throw new Error(`Failed to fetch AI config: ${configResponse.statusText}`);
      }
      
      aiConfig = await configResponse.json();
    } catch (error: any) {
      console.error('[Chat API] Error fetching AI config:', error);
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const errorMsg = 'Failed to fetch AI configuration. Please try again.';
          controller.enqueue(encoder.encode(`0:"${errorMsg.replace(/"/g, '\\"')}"\n`));
          controller.close();
        }
      });
      return new Response(stream, {
        status: 200,
        headers: { 
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    if (!aiConfig || !aiConfig.apiKey) {
      console.error('[Chat API] AI config missing API key for session:', sessionId);
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const errorMsg = 'AI provider not configured for this session.';
          controller.enqueue(encoder.encode(`0:"${errorMsg.replace(/"/g, '\\"')}"\n`));
          controller.close();
        }
      });
      return new Response(stream, {
        status: 200,
        headers: { 
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Use provider and model from config if available, otherwise use request body values
    const finalProvider = aiConfig.provider || provider;
    const finalModel = aiConfig.model || modelName;

    // Create Google provider with API key from backend (server-side only)
    // Note: We only support Google for now. OpenAI and Anthropic require installing additional packages
    console.log('[Chat API] Creating Google provider with model:', finalModel);
    const google = createGoogleGenerativeAI({
      apiKey: aiConfig.apiKey,
    });
    
    const model = google(finalModel || 'gemini-2.5-flash-lite');
    
    console.log('[Chat API] Starting stream...');
    
    try {
      // Validate messages array
      if (!Array.isArray(messages)) {
        throw new Error('Messages must be an array');
      }
      
      if (messages.length === 0) {
        throw new Error('Messages array cannot be empty');
      }
      
      // Validate each message has required fields
      // Messages can have either 'content' (string) or 'parts' (array) format
      for (const msg of messages) {
        if (!msg || typeof msg !== 'object') {
          throw new Error('Invalid message format: message must be an object');
        }
        if (!msg.role || typeof msg.role !== 'string') {
          throw new Error('Invalid message format: message must have a role');
        }
        // Check for either 'content' or 'parts' format
        const hasContent = msg.content !== undefined && msg.content !== null;
        const hasParts = msg.parts !== undefined && Array.isArray(msg.parts) && msg.parts.length > 0;
        if (!hasContent && !hasParts) {
          throw new Error('Invalid message format: message must have either content or parts');
        }
      }
      
      // Convert UI messages to core messages format
      const coreMessages = convertToCoreMessages(messages);
      console.log('[Chat API] Converted messages:', {
        count: coreMessages.length,
        roles: coreMessages.map((m: any) => m.role),
        lastMessage: coreMessages[coreMessages.length - 1],
      });
      
      // Get session system prompt (or use default)
      let systemPrompt = CHAT_SYSTEM_PROMPT;
      try {
        const sessionResponse = await fetch(`${baseUrl}/sessions/${sessionId}`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (sessionResponse.ok) {
          const session = await sessionResponse.json();
          if (session.systemPrompt) {
            systemPrompt = session.systemPrompt;
          }
        }
      } catch (error) {
        console.warn('[Chat API] Could not fetch session system prompt, using default:', error);
      }

      console.log('[Chat API] Calling streamText with model:', finalModel);
      const result = await streamText({
        model,
        messages: coreMessages,
        system: systemPrompt,
      });

      console.log('[Chat API] Stream created successfully, returning response...');
      
      // Return the stream in the UI message format that useChat expects
      const response = result.toUIMessageStreamResponse();
      console.log('[Chat API] Response created, status:', response.status);
      return response;
    } catch (streamError) {
      console.error('[Chat API] Stream error:', {
        error: streamError,
        message: streamError instanceof Error ? streamError.message : 'Unknown error',
        stack: streamError instanceof Error ? streamError.stack : undefined,
      });
      
      const errorMessage = streamError instanceof Error ? streamError.message : 'Stream error';
      
      // Check if this is a quota/rate limit error
      const isQuotaError = 
        errorMessage.includes('quota') ||
        errorMessage.includes('Quota exceeded') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('rate_limit') ||
        errorMessage.includes('RATE_LIMIT_EXCEEDED') ||
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('429');
      
      if (isQuotaError) {
        // Return 429 status to indicate rate limit (client should not retry)
        return new Response(JSON.stringify({ 
          error: 'QUOTA_EXCEEDED',
          message: 'API quota exceeded. Please wait before sending another message.',
          details: errorMessage,
        }), { 
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: 'Failed to start stream', 
        details: errorMessage 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('[Chat API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: 'Error processing chat', 
      details: errorMessage 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

