import { financialIntegrationService } from './financialIntegrationService';
import { financialActionService } from './financialActionService';

/**
 * 🏦 FinancialCache - Cache centralizado para dados financeiros
 * 
 * Reduz drasticamente chamadas repetidas a:
 * - financialIntegrationService.getPayables()
 * - financialIntegrationService.getReceivables()
 * - financialActionService.getStandaloneRecords()
 * 
 * TTL: 10s - alinhado com DashboardCache para evitar dados stale
 * 
 * Componentes críticos que se beneficiam:
 * - PayablesTab (recarrega a cada mudança de sub-aba)
 * - ReceivablesTab (filtragem open/all)
 * - HistoryTab (consolidação pesada)
 * - Dashboard KPIs financeiros
 */

type CachedData = {
  payables: any[];
  receivables: any[];
  standaloneRecords: any[];
  timestamp: number;
};

export class FinancialCache {
  private static cache: CachedData | null = null;
  private static readonly TTL = 10_000; // 10 segundos — alinhado com DashboardCache

  private static load(): void {
    this.cache = {
      payables: financialIntegrationService.getPayables(),
      receivables: financialIntegrationService.getReceivables(),
      standaloneRecords: financialActionService.getStandaloneRecords(),
      timestamp: Date.now()
    };
  }

  private static isValid(): boolean {
    if (!this.cache) return false;
    return (Date.now() - this.cache.timestamp) < this.TTL;
  }

  static getPayables(): any[] {
    if (!this.isValid()) this.load();
    return this.cache!.payables;
  }

  static getReceivables(): any[] {
    if (!this.isValid()) this.load();
    return this.cache!.receivables;
  }

  static getStandaloneRecords(): any[] {
    if (!this.isValid()) this.load();
    return this.cache!.standaloneRecords;
  }

  static invalidate(): void {
    this.cache = null;
  }
}

// Listener global para invalidar cache quando houver atualizações
if (typeof window !== 'undefined') {
  window.addEventListener('financial:updated', () => FinancialCache.invalidate());
  window.addEventListener('data:updated', () => FinancialCache.invalidate());
}

export const invalidateFinancialCache = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('financial:updated'));
  }
};
