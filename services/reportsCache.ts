// 📊 Cache dedicado para módulo de Relatórios
// Evita reprocessamento pesado de dados em cada filtro/refresh

import { purchaseService } from './purchaseService';
import { salesService } from './salesService';
import { loadingService } from './loadingService';
import { financialIntegrationService } from './financialIntegrationService';
import { loansService } from './loansService';
import { partnerService } from './partnerService';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class ReportsCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly TTL = 45000; // 45 segundos (similar ao financialCache)

  constructor() {
    // Invalidar cache quando dados mudarem
    window.addEventListener('data:updated', this.invalidateAll.bind(this));
    window.addEventListener('financial:updated', this.invalidateAll.bind(this));
  }

  // 🔍 Obter dados com cache
  private async getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.TTL) {
      return cached.data;
    }

    const freshData = await fetcher();
    this.cache.set(key, { data: freshData, timestamp: now });
    return freshData;
  }

  // 📦 Purchases
  async getAllPurchases() {
    return this.getCached('purchases:all', () => purchaseService.loadFromSupabase());
  }

  // 💰 Sales
  async getAllSales() {
    return this.getCached('sales:all', () => salesService.loadFromSupabase());
  }

  // 🚛 Loadings
  async getAllLoadings() {
    return this.getCached('loadings:all', () => loadingService.loadFromSupabase());
  }

  // 💳 Financial - Payables
  async getPayables() {
    return this.getCached('financial:payables', () => 
      financialIntegrationService.getPayables()
    );
  }

  // 💵 Financial - Receivables
  async getReceivables() {
    return this.getCached('financial:receivables', () => 
      financialIntegrationService.getReceivables()
    );
  }

  // 🏦 Loans (canônico via loansService)
  async getAllLoans() {
    return this.getCached('loans:all', () => loansService.getAll());
  }

  // 👥 Partners
  async getAllPartners() {
    return this.getCached('partners:all', () => partnerService.loadFromSupabase());
  }

  // 🔄 Invalidar todo cache
  invalidateAll() {
    this.cache.clear();
  }

  // 🎯 Invalidar cache específico
  invalidate(key: string) {
    const keysToDelete: string[] = [];
    
    // Match patterns
    this.cache.forEach((_, cacheKey) => {
      if (cacheKey.includes(key)) {
        keysToDelete.push(cacheKey);
      }
    });

    keysToDelete.forEach(k => this.cache.delete(k));
  }

  // 📈 Stats (debug)
  getStats() {
    const now = Date.now();
    const stats = {
      totalKeys: this.cache.size,
      fresh: 0,
      stale: 0,
      keys: [] as string[]
    };

    this.cache.forEach((entry, key) => {
      stats.keys.push(key);
      if ((now - entry.timestamp) < this.TTL) {
        stats.fresh++;
      } else {
        stats.stale++;
      }
    });

    return stats;
  }
}

// Singleton
export const reportsCache = new ReportsCache();
