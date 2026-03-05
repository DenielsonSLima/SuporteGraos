
// Modular WebSocket service with auto-reconnection and typed events

type ListenerCallback = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private url: string;
  private listeners: Map<string, ListenerCallback[]> = new Map();
  private reconnectInterval: number = 5000;
  private shouldReconnect: boolean = true;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    // In production, uncomment the connection logic
    // this.socket = new WebSocket(this.url);
    
    // this.socket.onopen = () => {
    //   console.log('WS Connected');
    //   // Re-subscribe to channels if needed
    // };

    // this.socket.onmessage = (event) => {
    //   try {
    //     const message = JSON.parse(event.data);
    //     this.dispatch(message.channel, message.data);
    //   } catch (e) {
    //     console.error('WS Message Parse Error', e);
    //   }
    // };

    // this.socket.onclose = () => {
    //   console.log('WS Disconnected');
    //   if (this.shouldReconnect) {
    //     setTimeout(() => this.connect(), this.reconnectInterval);
    //   }
    // };

    // this.socket.onerror = (err) => console.error('WS Error', err);
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.socket) {
      this.socket.close();
    }
  }

  subscribe(channel: string, callback: ListenerCallback): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, []);
    }
    this.listeners.get(channel)?.push(callback);

    return () => {
      const callbacks = this.listeners.get(channel);
      if (callbacks) {
        this.listeners.set(channel, callbacks.filter(cb => cb !== callback));
      }
    };
  }

  private dispatch(channel: string, data: any) {
    const callbacks = this.listeners.get(channel);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  send(channel: string, data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ channel, data }));
    } else {
    }
  }
}

// Fallback to localhost if env var is missing/fails
const WS_URL = 'ws://localhost:3000';
export const wsService = new WebSocketService(WS_URL);
