const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface User {
    user_id: string;
    email: string;
    name: string;
    picture?: string;
    is_active: boolean;
    is_verified: boolean;
    last_login?: string;
    created_at: string;
    preferences: {
        timezone: string;
        language: string;
        theme?: string;
        notifications_enabled?: boolean;
    };
}

export interface AuthTokens {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    user: User;
}

class AuthService {
    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    private user: User | null = null;

    constructor() {
        // Load tokens from localStorage on initialization
        this.loadFromStorage();
    }

    private loadFromStorage() {
        this.accessToken = localStorage.getItem('access_token');
        this.refreshToken = localStorage.getItem('refresh_token');
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                this.user = JSON.parse(userStr);
            } catch (e) {
                console.error('Failed to parse user from localStorage', e);
            }
        }
    }

    /**
     * Initiate Google OAuth login
     */
    login(redirectUrl?: string) {
        const url = new URL(`${API_BASE_URL}/auth/login`);
        if (redirectUrl) {
            url.searchParams.set('redirect_url', redirectUrl);
        }
        window.location.href = url.toString();
    }

    async devLogin(name = 'Demo user', email = 'demo@commix.dev'): Promise<User> {
        const response = await fetch(`${API_BASE_URL}/auth/dev-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email }),
        });
        if (!response.ok) throw new Error('Unable to start demo session');
        const data: AuthTokens = await response.json();
        this.saveSession(data);
        return data.user;
    }

    private saveSession(data: AuthTokens) {
        this.accessToken = data.access_token;
        this.refreshToken = data.refresh_token;
        this.user = data.user;
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
    }

    /**
     * Logout user
     */
    async logout(): Promise<void> {
        try {
            if (this.accessToken) {
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local storage
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            this.accessToken = null;
            this.refreshToken = null;
            this.user = null;
        }
    }

    /**
     * Get current user info
     */
    async getCurrentUser(): Promise<User | null> {
        if (!this.accessToken) {
            return null;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired, try to refresh
                    const refreshed = await this.refreshAccessToken();
                    if (refreshed) {
                        return this.getCurrentUser();
                    }
                }
                throw new Error('Failed to fetch user');
            }

            const user = await response.json();
            this.user = user;
            localStorage.setItem('user', JSON.stringify(user));
            return user;
        } catch (error) {
            console.error('Get current user error:', error);
            return null;
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(): Promise<boolean> {
        if (!this.refreshToken) {
            return false;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refresh_token: this.refreshToken
                })
            });

            if (!response.ok) {
                throw new Error('Failed to refresh token');
            }

            const data = await response.json();
            this.saveSession(data);
            return true;
        } catch (error) {
            console.error('Refresh token error:', error);
            // If refresh fails, logout
            await this.logout();
            return false;
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return !!this.accessToken;
    }

    /**
     * Get access token
     */
    getAccessToken(): string | null {
        return this.accessToken;
    }

    /**
     * Get user
     */
    getUser(): User | null {
        return this.user;
    }

    /**
     * Make authenticated API request
     */
    async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
        if (!this.accessToken) {
            throw new Error('Not authenticated');
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${this.accessToken}`
        };

        let response = await fetch(url, { ...options, headers });

        // If unauthorized, try to refresh token
        if (response.status === 401) {
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
                // Retry request with new token
                headers['Authorization'] = `Bearer ${this.accessToken}`;
                response = await fetch(url, { ...options, headers });
            } else {
                throw new Error('Authentication failed');
            }
        }

        return response;
    }
}

// Export singleton instance
export const authService = new AuthService();

export default authService;
