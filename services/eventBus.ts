type EventHandler = (data: any) => void;

class EventBus {
    private listeners: { [key: string]: EventHandler[] } = {};

    on(event: string, handler: EventHandler) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(handler);

        // Retorna função de unsubscribe
        return () => {
            this.off(event, handler);
        };
    }

    off(event: string, handler: EventHandler) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(h => h !== handler);
    }

    emit(event: string, data?: any) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(handler => handler(data));
    }
}

export const eventBus = new EventBus();
