import { cashierService } from '../modules/Cashier/services/cashierService';

/**
 * 💰 CashierCache - Cache para relatório de caixa
 * 
 * PROBLEMA IDENTIFICADO:
 * cashierService.getCurrentMonthReport() executa:
 * - 15+ chamadas getAll() de diferentes services
 * - Centenas de reduce/filter em loops
 * - Cálculos de saldo banco-por-banco
 * - Consolidação de ativos/passivos
 * 
 * Tempo: ~600-1200ms dependendo do volume
 * 
 * SOLUÇÃO:
 * Cache de 30s - adequado pois dados financeiros mudam com ações explícitas do usuário
 */

export class CashierCache {
  private static cachedReport: any | null = null;
  private static timestamp = 0;
  private static readonly TTL = 30_000; // 30 segundos

  static getCurrentMonthReport(): any {
    const now = Date.now();
    
    if (this.cachedReport && (now - this.timestamp) < this.TTL) {
      return this.cachedReport;
    }

    this.cachedReport = cashierService.getCurrentMonthReport();
    this.timestamp = now;
    
    return this.cachedReport;
  }

  static invalidate(): void {
    this.cachedReport = null;
    this.timestamp = 0;
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
