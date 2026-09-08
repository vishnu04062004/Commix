/**
 * WebSocket service for real-time chat communication
 */

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export interface WebSocketMessage {
    type: 'connected' | 'stream' | 'complete' | 'error' | 'status' | 'conversation_created' | 'conversation_history' | 'conversations_list' | 'pong';
    chunk?: string;
    response?: string;
    error?: string;
    status?: string;
    details?: string;
    session_id?: string;
    user_id?: string;
    conversation_id?: string;
    title?: string;
    conversation?: any;
    conversations?: any[];
    metadata?: Record<string, any>;
    timestamp?: string;
}

export interface WebSocketConfig {
    onConnected?: (data: WebSocketMessage) => void;
    onStream?: (chunk: string, metadata?: any) => void;
    onComplete?: (response: string, metadata?: any) => void;
    onError?: (error: string) => void;
    onStatus?: (status: string, details?: string) => void;
    onConversationCreated?: (conversationId: string, title?: string) => void;
    onDisconnected?: () => void;
}

export class WebSocketChatService {
    private ws: WebSocket | null = null;
    private config: WebSocketConfig;
    private userId: string;
    private sessionId: string | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private isIntentionalClose = false;
    private heartbeatInterval: NodeJS.Timeout | null = null;

    constructor(userId: string, config: WebSocketConfig) {
        this.userId = userId;
        this.config = config;
    }

    /**
     * Connect to WebSocket server
     */
    connect(sessionId?: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.isIntentionalClose = false;
                const url = `${WS_BASE_URL}/ws/chat?user_id=${this.userId}${sessionId ? `&session_id=${sessionId}` : ''}`;

                this.ws = new WebSocket(url);

                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.reconnectAttempts = 0;
                    this.startHeartbeat();
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const message: WebSocketMessage = JSON.parse(event.data);
                        this.handleMessage(message);
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log('WebSocket disconnected');
                    this.stopHeartbeat();

                    if (this.config.onDisconnected) {
                        this.config.onDisconnected();
                    }

                    // Attempt to reconnect if not intentionally closed
                    if (!this.isIntentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);

                        setTimeout(() => {
                            this.connect(this.sessionId || undefined);
                        }, this.reconnectDelay * this.reconnectAttempts);
                    }
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage(message: WebSocketMessage) {
        switch (message.type) {
            case 'connected':
                this.sessionId = message.session_id || null;
                if (this.config.onConnected) {
                    this.config.onConnected(message);
                }
                break;

            case 'stream':
                if (this.config.onStream && message.chunk) {
                    this.config.onStream(message.chunk, message.metadata);
                }
                break;

            case 'complete':
                if (this.config.onComplete && message.response) {
                    this.config.onComplete(message.response, message.metadata);
                }
                break;

            case 'error':
                if (this.config.onError && message.error) {
                    this.config.onError(message.error);
                }
                break;

            case 'status':
                if (this.config.onStatus && message.status) {
                    this.config.onStatus(message.status, message.details);
                }
                break;

            case 'conversation_created':
                if (this.config.onConversationCreated && message.conversation_id) {
                    this.config.onConversationCreated(message.conversation_id, message.title);
                }
                break;

            case 'pong':
                // Heartbeat response
                break;

            default:
                console.log('Unknown message type:', message.type);
        }
    }

    /**
     * Send a chat message
     */
    sendMessage(message: string, conversationId?: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not connected');
        }

        this.ws.send(JSON.stringify({
            type: 'chat',
            message,
            conversation_id: conversationId
        }));
    }

    /**
     * Request conversation history
     */
    getHistory(conversationId?: string, limit?: number) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not connected');
        }

        this.ws.send(JSON.stringify({
            type: 'get_history',
            conversation_id: conversationId,
            limit
        }));
    }

    /**
     * Start a new conversation
     */
    newConversation() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not connected');
        }

        this.ws.send(JSON.stringify({
            type: 'new_conversation'
        }));
    }

    /**
     * Start heartbeat to keep connection alive
     */
    private startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000); // Send ping every 30 seconds
    }

    /**
     * Stop heartbeat
     */
    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        this.isIntentionalClose = true;
        this.stopHeartbeat();

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Check if WebSocket is connected
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Get current session ID
     */
    getSessionId(): string | null {
        return this.sessionId;
    }
}
