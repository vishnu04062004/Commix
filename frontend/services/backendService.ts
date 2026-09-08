import { Message } from '../types';
import { authService } from './authService';

// Backend API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface UserRequest {
    user_id?: string;
    message: string;
    session_id?: string;
    metadata?: Record<string, any>;
}

export interface AgentResponse {
    response: string;
    session_id: string;
    action_required: boolean;
    suggested_actions?: string[];
    metadata?: Record<string, any>;
}

export interface HealthResponse {
    status: string;
    mongodb: boolean;
    redis: boolean;
    timestamp: string;
}

/**
 * Stream chat response from backend API
 */
export const streamChatResponse = async (
    history: Message[],
    newMessage: string,
    userId: string | undefined,
    sessionId: string | null,
    onChunk: (text: string) => void,
    abortSignal?: AbortSignal
): Promise<AgentResponse> => {
    try {
        const requestBody: UserRequest = {
            message: newMessage,
            session_id: sessionId || undefined,
            metadata: {
                history_length: history.length,
            },
        };

        // Get access token from localStorage
        const accessToken = authService.getAccessToken() || localStorage.getItem('access_token');
        if (!accessToken) {
            throw new Error('Not authenticated. Please sign in again.');
        }

        // Build headers
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Add Authorization header if user is authenticated
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody),
            signal: abortSignal,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            if (response.status === 401 || response.status === 403) {
                await authService.logout();
                throw new Error('Your session has expired. Please sign in again.');
            }
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const data: AgentResponse = await response.json();

        // Simulate streaming by chunking the response
        // This provides a better UX even though the backend returns the full response
        const words = data.response.split(' ');
        for (let i = 0; i < words.length; i += 4) {
            if (abortSignal?.aborted) {
                break;
            }
            const chunk = words.slice(i, i + 4).join(' ');
            onChunk(`${i > 0 ? ' ' : ''}${chunk}`);
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        return data;

    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw error;
        }
        console.error('Error streaming chat response:', error);
        throw new Error(error.message || 'Failed to get response from backend');
    }
};

/**
 * Check backend health status
 */
export const checkHealth = async (): Promise<HealthResponse> => {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error checking health:', error);
        throw error;
    }
};

/**
 * Confirm a pending action
 */
export const confirmAction = async (
    sessionId: string,
    confirmed: boolean
): Promise<any> => {
    try {
        // Get access token from localStorage
        const accessToken = localStorage.getItem('access_token');

        // Build headers
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Add Authorization header if user is authenticated
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/confirm/${sessionId}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ confirmed }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error confirming action:', error);
        throw error;
    }
};

/**
 * Test backend connection
 */
export const testConnection = async (): Promise<boolean> => {
    try {
        const health = await checkHealth();
        return health.status === 'healthy';
    } catch (error) {
        return false;
    }
};
