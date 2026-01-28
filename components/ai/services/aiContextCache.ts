import { aiContextService } from './aiContextService';

interface CacheEntry {
  data: string;
  timestamp: number;
}

class AIContextCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 30000; // 30 segundos

  getSystemContext(userName: string): string {
    const cacheKey = `context_${userName}`;
    const now = Date.now();

    // Verificar se cache existe e ainda é válido
    if (this.cache.has(cacheKey)) {
      const entry = this.cache.get(cacheKey)!;
      if (now - entry.timestamp < this.TTL) {
        return entry.data;
      }
    }

    // Cache miss ou expirado
    const context = aiContextService.getSystemContext(userName);
    this.cache.set(cacheKey, {
      data: context,
      timestamp: now
    });

    return context;
  }

  invalidate(userName: string): void {
    const cacheKey = `context_${userName}`;
    this.cache.delete(cacheKey);
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}

export const aiContextCache = new AIContextCache();

// Listeners para invalidar cache quando dados mudarem
if (typeof window !== 'undefined') {
  window.addEventListener('financial:updated', () => aiContextCache.invalidateAll());
  window.addEventListener('data:updated', () => aiContextCache.invalidateAll());
  window.addEventListener('settings:updated', () => aiContextCache.invalidateAll());
}
