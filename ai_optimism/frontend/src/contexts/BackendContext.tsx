'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';

interface BackendState {
    backendUrl: string;
}

interface BackendContextType {
    state: BackendState;
    setBackendUrl: (url: string) => void;
    backendApi: {
        evaluate: string;
        optimization: {
            createProblem: string;
            listProblems: string;
            execute: string;
            clear: string;
        };
        sessions: {
            create: string;
            list: string;
            get: (id: string) => string;
            update: (id: string) => string;
            delete: (id: string) => string;
            addMessage: (id: string) => string;
            getMessages: (id: string) => string;
            heartbeat: (id: string) => string;
            waiting: string;
            clear: string;
        };
    };
}

const BackendContext = createContext<BackendContextType | undefined>(undefined);

const STORAGE_KEY = 'backend_config';

const getBackendApi = (url: string) => ({
    evaluate: `${url}/api/evaluate/`,
    optimization: {
        createProblem: `${url}/api/optimization/problems/`,
        listProblems: `${url}/api/optimization/problems/`,
        execute: `${url}/api/optimization/execute/`,
        clear: `${url}/api/optimization/problems/clear/`,
    },
    sessions: {
        create: `${url}/api/sessions/`,
        list: `${url}/api/sessions/`,
        get: (id: string) => `${url}/api/sessions/${id}`,
        update: (id: string) => `${url}/api/sessions/${id}`,
        delete: (id: string) => `${url}/api/sessions/${id}`,
        addMessage: (id: string) => `${url}/api/sessions/${id}/messages`,
        getMessages: (id: string) => `${url}/api/sessions/${id}/messages`,
        heartbeat: (id: string) => `${url}/api/sessions/${id}/heartbeat`,
        waiting: `${url}/api/sessions/waiting/`,
        clear: `${url}/api/sessions/clear/`,
    },
});

export const BackendProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [backendUrl, setBackendUrlState] = useState<string>('http://localhost:8000');

    // Load saved configuration from localStorage and URL params on mount
    useEffect(() => {
        const loadConfig = () => {
            // Check URL params first
            const urlParams = new URLSearchParams(window.location.search);
            const backendParam = urlParams.get('backend');

            if (backendParam) {
                setBackendUrlState(backendParam);
                localStorage.setItem(STORAGE_KEY, backendParam);
                console.log('[Backend] Set URL from parameter:', backendParam);
                return;
            }

            // Fall back to localStorage
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                setBackendUrlState(saved);
                console.log('[Backend] Restored URL from localStorage:', saved);
            }
        };

        loadConfig();
    }, []);

    const setBackendUrl = (url: string) => {
        setBackendUrlState(url);
        localStorage.setItem(STORAGE_KEY, url);
        // Dispatch custom event for same-window updates
        window.dispatchEvent(new CustomEvent('backend-updated'));
        console.log('[Backend] Updated URL:', url);
    };

    const state = { backendUrl };
    const backendApi = useMemo(() => getBackendApi(backendUrl), [backendUrl]);

    return (
        <BackendContext.Provider value={{ state, setBackendUrl, backendApi }}>
            {children}
        </BackendContext.Provider>
    );
};

export const useBackend = () => {
    const context = useContext(BackendContext);
    if (!context) {
        throw new Error('useBackend must be used within a BackendProvider');
    }
    return context;
};