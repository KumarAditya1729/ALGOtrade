type EventHandler = (data: any) => void;

export class TradingTerminalSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Record<string, EventHandler[]> = {};

  constructor(url: string) {
    // Replace http/https with ws/wss
    this.url = url.replace(/^http/, 'ws') + '/ws';
  }

  connect(token?: string) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const wsUrl = token ? `${this.url}?token=${token}` : this.url;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected to terminal stream');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          // Assuming standard format { type: 'tick', data: {...} }
          const { type, data } = payload;
          if (type && this.listeners[type]) {
            this.listeners[type].forEach(fn => fn(data));
          }
        } catch (e) {
          console.error('[WebSocket] Failed to parse message:', event.data);
        }
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        this.attemptReconnect(token);
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };
    } catch (e) {
      console.error('[WebSocket] Initialization failed', e);
    }
  }

  private attemptReconnect(token?: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const timeout = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
      console.log(`[WebSocket] Reconnecting in ${timeout}ms... (Attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(token), timeout);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect loop
      this.ws.close();
      this.ws = null;
    }
  }

  on(event: string, callback: EventHandler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventHandler) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(fn => fn !== callback);
    }
  }
}

// Singleton instance using the environment API URL
export const wsClient = new TradingTerminalSocket(
  import.meta.env.VITE_API_URL || 'http://localhost:8000'
);
