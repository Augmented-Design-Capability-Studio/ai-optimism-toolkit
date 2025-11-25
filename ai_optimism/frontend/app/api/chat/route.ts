import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, convertToCoreMessages } from 'ai';
import { CHAT_SYSTEM_PROMPT } from '../../../src/config/prompts';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, apiKey, provider = 'google', model: modelName = 'gemini-2.5-flash' } = body;
    
    console.log('[Chat API] Request received:', { 
      hasApiKey: !!apiKey, 
      provider, 
      model: modelName,
      messageCount: messages?.length 
    });
    
    if (!apiKey || apiKey.trim() === '') {
      // Don't log error for initial empty requests (common on page load)
      if (!messages || messages.length === 0) {
        console.log('[Chat API] No API key provided (initial load - returning empty response)');
        // Return empty response that won't trigger errors
        // Create an empty stream that matches the expected format
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            // Send empty completion in the expected format
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
      } else {
        console.error('[Chat API] No API key provided for', messages.length, 'messages');
        // For requests with messages, return error but in a format that won't crash
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            // Send error message in the expected streaming format
            const errorMsg = 'API key required. Please configure your AI provider settings.';
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
    }

    // Create Google provider with user-provided API key
    // Note: We only support Google for now. OpenAI and Anthropic require installing additional packages
    console.log('[Chat API] Creating Google provider with model:', modelName);
    const google = createGoogleGenerativeAI({
      apiKey,
    });
    
    const model = google(modelName || 'gemini-2.5-flash');
    
    console.log('[Chat API] Starting stream...');
    
    try {
      // Convert UI messages to core messages format
      const coreMessages = convertToCoreMessages(messages);
      console.log('[Chat API] Converted messages:', coreMessages);
      
      const result = await streamText({
        model,
        messages: coreMessages,
        system: CHAT_SYSTEM_PROMPT,
      });

      console.log('[Chat API] Stream created, returning response...');
      
      // Return the stream in the UI message format that useChat expects
      return result.toUIMessageStreamResponse();
    } catch (streamError) {
      console.error('[Chat API] Stream error:', streamError);
      const errorMessage = streamError instanceof Error ? streamError.message : 'Stream error';
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

