/**
 * Backend API configuration
 * Uses environment variable if available, falls back to localhost for development
 */

export const BACKEND_URL = 
  process.env.NEXT_PUBLIC_BACKEND_URL || 
  'http://localhost:8000';

export const BACKEND_API = {
  evaluate: `${BACKEND_URL}/api/evaluate/evaluate`,
};
