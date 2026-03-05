/**
 * @deprecated SKIL Gap 7 — LoadingCache foi substituído por leitura direta via
 * loadingService.getByPurchaseOrder() / getBySalesOrder() + TanStack Query.
 * Este arquivo é mantido apenas para compatibilidade temporária.
 * NÃO adicione novos imports deste módulo.
 */
import { loadingService } from './loadingService';

// Tipos genéricos para manter compatibilidade sem acoplar aos módulos
type AnyLoading = any;

/**
 * 🚚 LoadingCache - Cache simples para romaneios/cargas
 * - TTL: 30s para evitar leituras repetidas do LocalStorage
 * - Foco: reduzir chamadas em KPIs de Compra/Venda
 */
export class LoadingCache {
  private static instance: AnyLoading[] | null = null;
  private static timestamp = 0;
  private static readonly TTL = 30_000; // 30 segundos

  static getAll(): AnyLoading[] {
    const now = Date.now();
    if (this.instance && (now - this.timestamp) < this.TTL) {
      return this.instance;
    }
    this.instance = loadingService.getAll();
    this.timestamp = now;
    return this.instance;
  }

  static getByPurchaseOrder(purchaseOrderId: string): AnyLoading[] {
    return this.getAll().filter(l => l.purchaseOrderId === purchaseOrderId);
  }

  static getBySalesOrder(salesOrderId: string): AnyLoading[] {
    return this.getAll().filter(l => l.salesOrderId === salesOrderId);
  }

  static invalidate(): void {
    this.instance = null;
    this.timestamp = 0;
  }
}

// Invalida automaticamente quando houver alterações de dados globais
if (typeof window !== 'undefined') {
  window.addEventListener('data:updated', () => LoadingCache.invalidate());
}

export const invalidateLoadingCache = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('data:updated'));
  }
};
