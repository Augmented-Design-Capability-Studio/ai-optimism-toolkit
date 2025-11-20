/**
 * Backend API configuration
 * Uses environment variable if available, falls back to localhost for development
 */

export const BACKEND_URL =
  (typeof window === 'undefined' ? process.env.NEXT_PUBLIC_BACKEND_URL : (window as any).NEXT_PUBLIC_BACKEND_URL) ||
  'http://localhost:8000';

export const BACKEND_API = {
  evaluate: `${BACKEND_URL}/api/evaluate/evaluate`,
  optimization: {
    createProblem: `${BACKEND_URL}/api/optimization/problems/`,
    listProblems: `${BACKEND_URL}/api/optimization/problems/`,
    execute: `${BACKEND_URL}/api/optimization/execute/`,
    clear: `${BACKEND_URL}/api/optimization/problems/clear/`,
  },
};
