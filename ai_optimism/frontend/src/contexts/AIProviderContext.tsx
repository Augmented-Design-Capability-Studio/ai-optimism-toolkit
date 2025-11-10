import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import aiApi from '../services/ai';
import type { AIProvider, AIValidationResponse } from '../services/ai';

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
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const config = JSON.parse(saved);
                setState(prev => ({
                    ...prev,
                    provider: config.provider,
                    model: config.model,
                    apiKey: config.apiKey,
                    endpoint: config.endpoint,
                    // Don't automatically set as connected - require revalidation
                }));
            } catch (e) {
                console.error('Failed to load saved AI provider config:', e);
            }
        }
    }, []);

    const connect = async (
        provider: AIProvider,
        apiKey: string,
        model: string,
        endpoint?: string
    ): Promise<boolean> => {
        setState(prev => ({ ...prev, status: 'connecting', errorMessage: null }));

        try {
            const response: AIValidationResponse = await aiApi.validateConnection({
                provider,
                api_key: apiKey,
                model,
                endpoint,
            });

            if (response.status === 'success') {
                const newState = {
                    provider,
                    model,
                    apiKey,
                    endpoint: endpoint || null,
                    status: 'connected' as ConnectionStatus,
                    lastValidated: new Date(),
                    errorMessage: null,
                };
                setState(newState);

                // Save to localStorage (WARNING: Stores API key locally)
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    provider,
                    model,
                    apiKey,
                    endpoint,
                }));

                return true;
            } else {
                setState(prev => ({
                    ...prev,
                    status: 'error',
                    errorMessage: response.message,
                }));
                return false;
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || error.message || 'Connection failed';
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
