
// This utility simulates a Database connection using LocalStorage.
// Optimized for ERP scale with pre-filtering capabilities.

export class Persistence<T extends { id: string }> {
  private key: string;
  private inMemoryData: T[];
  private listeners: Array<(items: T[]) => void> = [];

  constructor(key: string, initialData: T[] = []) {
    this.key = `sg_erp_${key}`;
    this.inMemoryData = initialData;
    this.load();

    // Sincronização entre abas: ouvir eventos de storage
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e: StorageEvent) => {
        try {
          if (e.key === this.key) {
            this.load();
            this.notify();
          }
        } catch (err) {
          console.error(`Error handling storage event for ${this.key}`, err);
        }
      });
    }
  }

  private load() {
    try {
      const stored = localStorage.getItem(this.key);
      if (stored) {
        this.inMemoryData = JSON.parse(stored);
      } else {
        this.save();
      }
    } catch (e) {
      console.error(`Error loading ${this.key}`, e);
      this.inMemoryData = [];
    }
  }

  private save() {
    try {
      // Limit check for localStorage (approx 5MB)
      localStorage.setItem(this.key, JSON.stringify(this.inMemoryData));
      this.notify();
    } catch (e) {
      console.error(`Error saving ${this.key}. LocalStorage might be full.`, e);
    }
  }

  getAll(): T[] {
    // Return a shallow copy to prevent direct mutation and ensure reactivity
    return [...this.inMemoryData];
  }

  getById(id: string): T | undefined {
    return this.inMemoryData.find(item => item.id === id);
  }

  /**
   * Optimized filter that operates on memory without reloading from disk
   */
  find(predicate: (item: T) => boolean): T[] {
    return this.inMemoryData.filter(predicate);
  }

  add(item: T): void {
    this.inMemoryData = [item, ...this.inMemoryData];
    this.save();
  }

  update(updatedItem: T): void {
    const index = this.inMemoryData.findIndex(item => item.id === updatedItem.id);
    if (index !== -1) {
      this.inMemoryData[index] = updatedItem;
      this.save();
    }
  }

  delete(id: string): void {
    this.inMemoryData = this.inMemoryData.filter(item => item.id !== id);
    this.save();
  }
  
  setAll(items: T[]): void {
    this.inMemoryData = items;
    this.save();
  }

  clear(): void {
    this.inMemoryData = [];
    this.save();
  }

  /**
   * Inscreve-se para mudanças no cache (reativo). Retorna função de unsubscribe.
   */
  subscribe(callback: (items: T[]) => void): () => void {
    this.listeners.push(callback);
    // Emite estado atual imediatamente
    try { callback(this.getAll()); } catch {}
    return () => {
      this.listeners = this.listeners.filter(fn => fn !== callback);
    };
  }

  private notify() {
    const snapshot = this.getAll();
    this.listeners.forEach(fn => {
      try { fn(snapshot); } catch (e) { console.error('Listener error', e); }
    });
  }
}
