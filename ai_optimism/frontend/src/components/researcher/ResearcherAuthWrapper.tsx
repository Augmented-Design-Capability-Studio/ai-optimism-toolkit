/**
 * Authentication wrapper for researcher dashboard
 * Simple password-based protection
 */

'use client';

import { AuthWrapper } from '../shared/auth/AuthWrapper';

interface AuthWrapperProps {
    children: React.ReactNode | ((logout: () => void) => React.ReactNode);
}

const STORAGE_KEY = 'researcher_auth_token';
const AUTH_PASSWORD = process.env.NEXT_PUBLIC_RESEARCHER_PASSWORD || 'researcher123';

export function ResearcherAuthWrapper({ children }: AuthWrapperProps) {
    return (
        <AuthWrapper
            storageKey={STORAGE_KEY}
            password={AUTH_PASSWORD}
            title="Researcher Access"
            subtitle="Enter password to access the researcher dashboard"
            buttonLabel="Access Dashboard"
            passwordLabel="Password"
            errorMessage="Invalid password. Please try again."
            envVarName="NEXT_PUBLIC_RESEARCHER_PASSWORD"
            showLoadingState={false}
        >
            {children}
        </AuthWrapper>
    );
}
