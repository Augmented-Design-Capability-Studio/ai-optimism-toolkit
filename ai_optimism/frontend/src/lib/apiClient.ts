import axios from 'axios';

// Use environment variable or default to /api
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add response interceptor for common error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Log error but don't expose sensitive info
        const errorMessage = error.response?.data?.detail || error.message || 'An unknown error occurred';
        console.error('[API Error]', errorMessage);
        return Promise.reject(error);
    }
);

export const setBaseUrl = (url: string) => {
    apiClient.defaults.baseURL = url;
};
