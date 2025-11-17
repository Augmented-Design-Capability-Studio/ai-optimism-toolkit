module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/src/contexts/AIProviderContext.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AIProviderProvider",
    ()=>AIProviderProvider,
    "useAIProvider",
    ()=>useAIProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
;
;
const AIProviderContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
const STORAGE_KEY = 'ai_provider_config';
const AIProviderProvider = ({ children })=>{
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        provider: null,
        model: null,
        apiKey: null,
        endpoint: null,
        status: 'disconnected',
        lastValidated: null,
        errorMessage: null
    });
    // Load saved configuration from localStorage on mount
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const config = JSON.parse(saved);
                // If we have a saved API key and provider, restore as connected
                const hasValidConfig = config.apiKey && config.provider && config.model;
                setState((prev)=>({
                        ...prev,
                        provider: config.provider,
                        model: config.model,
                        apiKey: config.apiKey,
                        endpoint: config.endpoint,
                        status: hasValidConfig ? 'connected' : 'disconnected',
                        lastValidated: hasValidConfig ? new Date() : null
                    }));
                if (hasValidConfig) {
                    console.log('[AIProvider] Restored connection from localStorage:', {
                        provider: config.provider,
                        model: config.model,
                        hasApiKey: !!config.apiKey
                    });
                }
            } catch (e) {
                console.error('Failed to load saved AI provider config:', e);
            }
        }
    }, []);
    const connect = async (provider, apiKey, model, endpoint)=>{
        // Validate API key is not empty
        if (!apiKey || apiKey.trim() === '') {
            setState((prev)=>({
                    ...prev,
                    status: 'error',
                    errorMessage: 'API key cannot be empty'
                }));
            return false;
        }
        setState((prev)=>({
                ...prev,
                status: 'connecting',
                errorMessage: null
            }));
        try {
            // Test the API key by making a simple request to the chat endpoint
            const controller = new AbortController();
            const timeoutId = setTimeout(()=>{
                controller.abort();
            }, 10000); // 10 second timeout
            const testResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apiKey,
                    provider,
                    model,
                    messages: [
                        {
                            role: 'user',
                            parts: [
                                {
                                    type: 'text',
                                    text: 'Hi'
                                }
                            ]
                        }
                    ]
                }),
                signal: controller.signal
            });
            if (!testResponse.ok) {
                clearTimeout(timeoutId);
                const errorData = await testResponse.json().catch(()=>({
                        error: 'Connection failed'
                    }));
                setState((prev)=>({
                        ...prev,
                        status: 'error',
                        errorMessage: errorData.error || `HTTP ${testResponse.status}`
                    }));
                return false;
            }
            // For streaming responses, we'll just check that we got a 200
            const contentType = testResponse.headers.get('content-type');
            if (!contentType || !contentType.includes('text')) {
                clearTimeout(timeoutId);
                setState((prev)=>({
                        ...prev,
                        status: 'error',
                        errorMessage: 'Invalid response from server'
                    }));
                return false;
            }
            // Response looks good - connection is valid
            clearTimeout(timeoutId);
            setState((prev)=>({
                    ...prev,
                    provider,
                    apiKey,
                    model,
                    endpoint: endpoint || null,
                    status: 'connected',
                    lastValidated: new Date(),
                    errorMessage: null
                }));
            // Save to localStorage for persistence (consider encrypting in production)
            const config = {
                provider,
                apiKey,
                model,
                endpoint
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Connection failed';
            setState((prev)=>({
                    ...prev,
                    status: 'error',
                    errorMessage
                }));
            return false;
        }
    };
    const disconnect = ()=>{
        setState({
            provider: null,
            model: null,
            apiKey: null,
            endpoint: null,
            status: 'disconnected',
            lastValidated: null,
            errorMessage: null
        });
        localStorage.removeItem(STORAGE_KEY);
    };
    const value = {
        state,
        connect,
        disconnect,
        isConnected: state.status === 'connected'
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AIProviderContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/contexts/AIProviderContext.tsx",
        lineNumber: 179,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
const useAIProvider = ()=>{
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(AIProviderContext);
    if (context === undefined) {
        throw new Error('useAIProvider must be used within an AIProviderProvider');
    }
    return context;
};
}),
"[project]/src/lib/emotionCache.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>createEmotionCache
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$emotion$2f$cache$2f$dist$2f$emotion$2d$cache$2e$development$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@emotion/cache/dist/emotion-cache.development.esm.js [app-ssr] (ecmascript)");
;
const isBrowser = typeof document !== 'undefined';
function createEmotionCache() {
    let insertionPoint;
    if (isBrowser) {
        const emotionInsertionPoint = document.querySelector('meta[name="emotion-insertion-point"]');
        insertionPoint = emotionInsertionPoint ?? undefined;
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$emotion$2f$cache$2f$dist$2f$emotion$2d$cache$2e$development$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])({
        key: 'mui-style',
        insertionPoint
    });
}
}),
"[project]/app/providers.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Providers
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/queryClient.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$emotion$2f$react$2f$dist$2f$emotion$2d$element$2d$782f682d$2e$development$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__C__as__CacheProvider$3e$__ = __turbopack_context__.i("[project]/node_modules/@emotion/react/dist/emotion-element-782f682d.development.esm.js [app-ssr] (ecmascript) <export C as CacheProvider>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$AIProviderContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/AIProviderContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$emotionCache$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/emotionCache.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
// Create emotion cache on client side
const clientSideEmotionCache = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$emotionCache$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])();
function Providers({ children }) {
    const [queryClient] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["QueryClient"]());
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$emotion$2f$react$2f$dist$2f$emotion$2d$element$2d$782f682d$2e$development$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__C__as__CacheProvider$3e$__["CacheProvider"], {
        value: clientSideEmotionCache,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["QueryClientProvider"], {
            client: queryClient,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$AIProviderContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AIProviderProvider"], {
                children: children
            }, void 0, false, {
                fileName: "[project]/app/providers.tsx",
                lineNumber: 18,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/providers.tsx",
            lineNumber: 17,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/providers.tsx",
        lineNumber: 16,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__e7382376._.js.map