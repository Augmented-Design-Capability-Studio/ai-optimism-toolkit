import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AIProvider } from '../services/ai';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface AIProviderState {
    provider: AIProvider | null;
    model: string | null;
    apiKey: string | null;
    endpoint: string | null;
    status: ConnectionStatus;
    lastValidated: Date | null;
    errorMessage: string | null;
}

interface AIProviderContextType {
    state: AIProviderState;
    connect: (provider: AIProvider, apiKey: string, model: string, endpoint?: string) => Promise<boolean>;
    disconnect: () => void;
    isConnected: boolean;
}

const AIProviderContext = createContext<AIProviderContextType | undefined>(undefined);

const STORAGE_KEY = 'ai_provider_config';

export const AIProviderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AIProviderState>({
        provider: null,
        model: null,
        apiKey: null,
        endpoint: null,
        status: 'disconnected',
        lastValidated: null,
        errorMessage: null,
    });

    // Load saved configuration from localStorage on mount
    useEffect(() => {
        const loadConfig = () => {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    const config = JSON.parse(saved);
                    // If we have a saved API key and provider, restore as connected
                    const hasValidConfig = config.apiKey && config.provider && config.model;
                    setState(prev => ({
                        ...prev,
                        provider: config.provider,
                        model: config.model,
                        apiKey: config.apiKey,
                        endpoint: config.endpoint,
                        status: hasValidConfig ? 'connected' : 'disconnected',
                        lastValidated: hasValidConfig ? new Date() : null,
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
            } else {
                // No saved config, ensure disconnected state
                setState(prev => ({
                    ...prev,
                    provider: null,
                    model: null,
                    apiKey: null,
                    endpoint: null,
                    status: 'disconnected',
                    lastValidated: null,
                }));
            }
        };

        // Load on mount
        loadConfig();

        // Listen for storage changes from other tabs/windows
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) {
                console.log('[AIProvider] Storage changed in another tab, reloading config');
                loadConfig();
            }
        };

        // Listen for custom event for same-window updates
        const handleCustomUpdate = () => {
            console.log('[AIProvider] Config updated in same window, reloading');
            loadConfig();
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('ai-provider-updated', handleCustomUpdate);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('ai-provider-updated', handleCustomUpdate);
        };
    }, []);

    const connect = async (provider: AIProvider, apiKey: string, model: string, endpoint?: string): Promise<boolean> => {
        // Validate API key is not empty
        if (!apiKey || apiKey.trim() === '') {
            setState(prev => ({
                ...prev,
                status: 'error',
                errorMessage: 'API key cannot be empty',
            }));
            return false;
        }

        setState(prev => ({
            ...prev,
            status: 'connecting',
            errorMessage: null,
        }));

        try {
            // Test the API key by making a simple request to the chat endpoint
            console.log('[AIProvider] Testing API key...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                console.log('[AIProvider] Validation timeout');
            }, 10000); // 10 second timeout

            const testResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey,
                    provider,
                    model,
                    messages: [{ role: 'user', parts: [{ type: 'text', text: 'Hi' }] }],
                }),
                signal: controller.signal,
            });

            console.log('[AIProvider] Response status:', testResponse.status);

            if (!testResponse.ok) {
                clearTimeout(timeoutId);
                const errorData = await testResponse.json().catch(() => ({ error: 'Connection failed' }));
                console.error('[AIProvider] Response not OK:', errorData);
                setState(prev => ({
                    ...prev,
                    status: 'error',
                    errorMessage: errorData.error || `HTTP ${testResponse.status}`,
                }));
                return false;
            }

            // For streaming responses, check that we got a 200 and validate the stream content
            const contentType = testResponse.headers.get('content-type');
            console.log('[AIProvider] Response content-type:', contentType);

            if (!contentType || !contentType.includes('text')) {
                clearTimeout(timeoutId);
                console.error('[AIProvider] Invalid content type:', contentType);
                setState(prev => ({
                    ...prev,
                    status: 'error',
                    errorMessage: 'Invalid response from server',
                }));
                return false;
            }

            // Read the stream to validate the response contains actual AI content, not an error
            let accumulated = '';
            let hasValidContent = false;
            let hasError = false;
            const reader = testResponse.body?.getReader();
            
            if (reader) {
                try {
                    // Try to read up to 3 chunks or until we have enough data to validate
                    for (let i = 0; i < 3 && !hasError && !hasValidContent; i++) {
                        const readPromise = reader.read();
                        const timeoutPromise = new Promise<never>((_, reject) => 
                            setTimeout(() => reject(new Error('Read timeout')), 2000)
                        );
                        
                        const { done, value } = await Promise.race([readPromise, timeoutPromise]);
                        
                        if (done) break;
                        
                        const chunk = new TextDecoder().decode(value);
                        accumulated += chunk;
                        console.log('[AIProvider] Validation chunk:', chunk.substring(0, 100));

                        // Check for error indicators in the accumulated content
                        if (accumulated.includes('"error"') || 
                            accumulated.includes('API_KEY') || 
                            accumulated.includes('invalid') || 
                            accumulated.includes('unauthorized') ||
                            accumulated.includes('403') ||
                            accumulated.includes('401') ||
                            accumulated.includes('authentication') ||
                            accumulated.includes('permission')) {
                            hasError = true;
                        }

                        // If we have substantial content without errors, consider it valid
                        if (accumulated.length > 200 && !hasError) {
                            hasValidContent = true;
                        }
                    }
                } catch (readError) {
                    console.error('[AIProvider] Error reading stream during validation:', readError);
                    hasError = true;
                } finally {
                    reader.releaseLock();
                }
            }

            if (hasError || !hasValidContent) {
                clearTimeout(timeoutId);
                console.error('[AIProvider] Validation failed - hasError:', hasError, 'hasValidContent:', hasValidContent);
                setState(prev => ({
                    ...prev,
                    status: 'error',
                    errorMessage: hasError ? 'Invalid API key or connection failed' : 'No valid response from AI service',
                }));
                return false;
            }

            // Response validation successful
            clearTimeout(timeoutId);
            console.log('[AIProvider] Validation successful!');
            setState(prev => ({
                ...prev,
                provider,
                apiKey,
                model,
                endpoint: endpoint || null,
                status: 'connected',
                lastValidated: new Date(),
                errorMessage: null,
            }));

            // Save to localStorage for persistence (consider encrypting in production)
            const config = { provider, apiKey, model, endpoint };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

            // Dispatch custom event to notify other components in same window
            window.dispatchEvent(new Event('ai-provider-updated'));

            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Connection failed';
            setState(prev => ({
                ...prev,
                status: 'error',
                errorMessage,
            }));
            return false;
        }
    };

    const disconnect = () => {
        setState({
            provider: null,
            model: null,
            apiKey: null,
            endpoint: null,
            status: 'disconnected',
            lastValidated: null,
            errorMessage: null,
        });
        localStorage.removeItem(STORAGE_KEY);

        // Dispatch custom event to notify other components in same window
        window.dispatchEvent(new Event('ai-provider-updated'));
    };

    const value: AIProviderContextType = {
        state,
        connect,
        disconnect,
        isConnected: state.status === 'connected',
    };

    return (
        <AIProviderContext.Provider value={value}>
            {children}
        </AIProviderContext.Provider>
    );
};

export const useAIProvider = (): AIProviderContextType => {
    const context = useContext(AIProviderContext);
    if (context === undefined) {
        throw new Error('useAIProvider must be used within an AIProviderProvider');
    }
    return context;
};
