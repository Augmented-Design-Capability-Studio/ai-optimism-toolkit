(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__9db4bc9a._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/app/api/chat/route.ts [app-edge-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$google$2f$dist$2f$index$2e$mjs__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@ai-sdk/google/dist/index.mjs [app-edge-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/ai/dist/index.mjs [app-edge-route] (ecmascript) <locals>");
;
;
const runtime = 'edge';
async function POST(req) {
    try {
        const body = await req.json();
        const { messages, apiKey, provider = 'google', model: modelName = 'gemini-2.0-flash' } = body;
        console.log('[Chat API] Request received:', {
            hasApiKey: !!apiKey,
            provider,
            model: modelName,
            messageCount: messages?.length
        });
        if (!apiKey) {
            // Don't log error for initial empty requests (common on page load)
            if (!messages || messages.length === 0) {
                console.log('[Chat API] No API key provided (initial load - ignoring)');
            } else {
                console.error('[Chat API] No API key provided for', messages.length, 'messages');
            }
            return new Response(JSON.stringify({
                error: 'API key required. Please configure your AI provider settings.'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
        // Create Google provider with user-provided API key
        // Note: We only support Google for now. OpenAI and Anthropic require installing additional packages
        console.log('[Chat API] Creating Google provider with model:', modelName);
        const google = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$google$2f$dist$2f$index$2e$mjs__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["createGoogleGenerativeAI"])({
            apiKey
        });
        const model = google(modelName || 'gemini-2.0-flash');
        console.log('[Chat API] Starting stream...');
        try {
            // Convert UI messages to core messages format
            const coreMessages = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["convertToCoreMessages"])(messages);
            console.log('[Chat API] Converted messages:', coreMessages);
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["streamText"])({
                model,
                messages: coreMessages,
                system: `You are an expert optimization assistant helping users design optimization problems. 
      
Guide users through:
1. Defining variables (what can be changed)
2. Setting properties (calculated values based on variables)
3. Defining objectives (what to optimize for)
4. Adding constraints (limits and requirements)

When extracting information, be precise and structured. Ask clarifying questions when needed.`
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
                headers: {
                    'Content-Type': 'application/json'
                }
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
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__9db4bc9a._.js.map