import { cashierService } from '../modules/Cashier/services/cashierService';

/**
 * 💰 CashierCache - Cache para relatório de caixa (ASYNC)
 *
 * cashierService.getCurrentMonthReport() agora é ASYNC (chama RPC SQL).
 * Cache de 30s — dados financeiros mudam com ações explícitas do usuário.
 */

export class CashierCache {
  private static cachedReport: any | null = null;
  private static timestamp = 0;
  private static pendingPromise: Promise<any> | null = null;
  private static readonly TTL = 30_000; // 30 segundos

  /**
   * Retorna relatório do cache ou busca do SQL (async).
   */
  static async getCurrentMonthReport(): Promise<any> {
    const now = Date.now();

    // Cache HIT
    if (this.cachedReport && (now - this.timestamp) < this.TTL) {
      return this.cachedReport;
    }

    // Evita requisições duplicadas
    if (this.pendingPromise) return this.pendingPromise;

    this.pendingPromise = cashierService.getCurrentMonthReport()
      .then(report => {
        this.cachedReport = report;
        this.timestamp = Date.now();
        this.pendingPromise = null;
        return report;
      })
      .catch(err => {
        this.pendingPromise = null;
        throw err;
      });

    return this.pendingPromise;
  }

  /**
   * Retorna o último relatório cacheado (síncrono, pode ser null).
   * Útil para componentes que já carregaram antes.
   */
  static getCachedReport(): any | null {
    return this.cachedReport;
  }

  static invalidate(): void {
    this.cachedReport = null;
    this.timestamp = 0;
    this.pendingPromise = null;
  }
}

// Listener global para invalidar após operações financeiras
if (typeof window !== 'undefined') {
  window.addEventListener('financial:updated', () => CashierCache.invalidate());
  window.addEventListener('data:updated', () => CashierCache.invalidate());
}

export const invalidateCashierCache = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('financial:updated'));
  }
};
