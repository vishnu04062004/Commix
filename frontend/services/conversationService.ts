const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ConversationMessage { id: string; role: 'user' | 'assistant' | 'system'; content: string; timestamp: string; metadata?: Record<string, any>; }
export interface Conversation { conversation_id: string; user_id: string; session_id: string; title?: string; messages: ConversationMessage[]; created_at: string; updated_at: string; is_archived: boolean; total_tokens: number; metadata?: Record<string, any>; }
const request = async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    const token = localStorage.getItem('access_token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || `Request failed (${response.status})`);
    return response.json();
};
export const getUserConversations = (userId: string, limit = 50, skip = 0, includeArchived = false): Promise<{ conversations: Conversation[]; total: number }> => request(`/api/conversations?user_id=${encodeURIComponent(userId)}&limit=${limit}&skip=${skip}&include_archived=${includeArchived}`);
export const getConversation = (id: string): Promise<Conversation> => request(`/api/conversations/${id}`);
export const getConversationMessages = (id: string): Promise<{ conversation_id: string; messages: ConversationMessage[]; total: number }> => request(`/api/conversations/${id}/messages`);
export const createConversation = (userId: string, sessionId: string, firstMessage?: string): Promise<Conversation> => request('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, session_id: sessionId, first_message: firstMessage }) });
export const updateConversation = (id: string, title: string) => request(`/api/conversations/${id}?title=${encodeURIComponent(title)}`, { method: 'PATCH' });
export const deleteConversation = (id: string) => request(`/api/conversations/${id}`, { method: 'DELETE' });
export const archiveConversation = (id: string) => request(`/api/conversations/${id}/archive`, { method: 'POST' });
