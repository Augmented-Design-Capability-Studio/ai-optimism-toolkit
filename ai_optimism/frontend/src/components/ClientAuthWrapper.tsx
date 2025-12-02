/**
 * Authentication wrapper for main app
 * Simple password-based protection
 */

'use client';

import { AuthWrapper } from './shared/auth/AuthWrapper';

interface ClientAuthWrapperProps {
    children: React.ReactNode | ((logout: () => void) => React.ReactNode);
}

const STORAGE_KEY = 'client_auth_token';
const AUTH_PASSWORD = process.env.NEXT_PUBLIC_CLIENT_ACCESS_PASSWORD || 'client123';

export function ClientAuthWrapper({ children }: ClientAuthWrapperProps) {
    return (
        <AuthWrapper
            storageKey={STORAGE_KEY}
            password={AUTH_PASSWORD}
            title="AI Optimization Toolkit"
            subtitle="Enter access code to start optimizing"
            buttonLabel="Access Toolkit"
            passwordLabel="Access Code"
            errorMessage="Invalid access code. Please try again."
            envVarName="NEXT_PUBLIC_CLIENT_ACCESS_PASSWORD"
            showLoadingState={true}
        >
            {children}
        </AuthWrapper>
    );
}