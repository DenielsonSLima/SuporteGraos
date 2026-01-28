// 📊 Cache dedicado para módulo de Relatórios
// Evita reprocessamento pesado de dados em cada filtro/refresh

import { purchaseService } from './purchaseService';
import { salesService } from './salesService';
import { loadingService } from './loadingService';
import { financialIntegrationService } from './financialIntegrationService';
import { loanService } from './loanService';
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
  private getCached<T>(key: string, fetcher: () => T): T {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.TTL) {
      return cached.data;
    }

    const freshData = fetcher();
    this.cache.set(key, { data: freshData, timestamp: now });
    return freshData;
  }

  // 📦 Purchases
  getAllPurchases() {
    return this.getCached('purchases:all', () => purchaseService.getAll());
  }

  // 💰 Sales
  getAllSales() {
    return this.getCached('sales:all', () => salesService.getAll());
  }

  // 🚛 Loadings
  getAllLoadings() {
    return this.getCached('loadings:all', () => loadingService.getAll());
  }

  // 💳 Financial - Payables
  getPayables() {
    return this.getCached('financial:payables', () => 
      financialIntegrationService.getPayables()
    );
  }

  // 💵 Financial - Receivables
  getReceivables() {
    return this.getCached('financial:receivables', () => 
      financialIntegrationService.getReceivables()
    );
  }

  // 🏦 Loans
  getAllLoans() {
    return this.getCached('loans:all', () => loanService.getAll());
  }

  // 👥 Partners
  getAllPartners() {
    return this.getCached('partners:all', () => partnerService.getAll());
  }

  // 📊 Dados agregados para Account Statement (evita triple loop)
  getAllTransactions() {
    return this.getCached('transactions:all', () => {
      const allTransactions: any[] = [];

      // Purchases
      this.getAllPurchases().forEach(p => {
        (p.transactions || []).forEach(t => {
          allTransactions.push({
            date: t.date,
            description: `Compra #${p.number} - ${p.partnerName}`,
            type: 'debit',
            value: t.value,
            accountId: t.accountId,
            accountName: t.accountName,
            category: 'purchase'
          });
        });
      });

      // Sales
      this.getAllSales().forEach(s => {
        (s.transactions || []).forEach(t => {
          allTransactions.push({
            date: t.date,
            description: `Venda #${s.number} - ${s.customerName}`,
            type: 'credit',
            value: t.value,
            accountId: t.accountId,
            accountName: t.accountName,
            category: 'sale'
          });
        });
      });

      // Loadings
      this.getAllLoadings().forEach(l => {
        (l.transactions || []).forEach(t => {
          allTransactions.push({
            date: t.date,
            description: `Frete - Placa ${l.vehiclePlate}`,
            type: 'debit',
            value: t.value,
            accountId: t.accountId,
            accountName: t.accountName,
            category: 'freight'
          });
        });
      });

      return allTransactions;
    });
  }

  // 🔄 Invalidar todo cache
  invalidateAll() {
    this.cache.clear();
    console.log('📊 ReportsCache invalidated');
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
