import { financialActionService } from './financialActionService';
// Importação dinâmica para evitar dependência circular
let financialServiceInstance: any = null;

const getFinancialService = () => {
  if (!financialServiceInstance) {
    import('./financialService').then(module => {
      financialServiceInstance = module.financialService;
    });
  }
  return financialServiceInstance;
};

export type BankAccountWithBalance = any & { currentBalance: number };

/**
 * 📊 LEDGER SERVICE - Fonte Única de Verdade para Saldos Bancários
 * 
 * Responsável por:
 * - Calcular saldo REAL de cada conta (sem cache)
 * - Gerenciar eventos de mudança de transações
 * - Notificar todas as telas quando há alteração
 * 
 * Usualmente chamado por:
 * - PurchaseOrder (Despesa Extra, Pagamento)
 * - Financial (Despesa Admin, Recebimento)
 * - Loadings (Frete)
 */

interface LedgerListeners {
  [key: string]: ((data: any) => void)[];
}

class LedgerService {
  private listeners: LedgerListeners = {};

  /**
   * Calcula saldo ATUAL de uma conta específica
   * NUNCA cacheado - sempre recalcula do zero
   */
  getAccountBalance(accountId: string): number {
    const financialService = getFinancialService();
    if (!financialService) return 0;
    const accounts = financialService.getBankAccountsWithBalances();
    const account = accounts.find((a: any) => a.id === accountId);
    return account ? account.currentBalance : 0;
  }

  /**
   * Retorna TODAS as contas com saldos reais
   * NUNCA cacheado - sempre recalcula do zero
   */
  getAllAccountsWithBalances(): BankAccountWithBalance[] {
    const financialService = getFinancialService();
    if (!financialService) return [];
    return financialService.getBankAccountsWithBalances();
  }

  /**
   * Notifica que houve mudança em transação
   * Dispara evento para toda a aplicação ouvir
   * Chamado após: add, update ou delete de transação
   */
  onTransactionChange(type: 'add' | 'update' | 'delete', transaction: any): void {
    console.log(`📝 Ledger Event: ${type}`, transaction);
    
    // Dispara evento global para todos ouvirem
    const event = new CustomEvent('ledger:transaction-changed', {
      detail: { type, transaction, timestamp: Date.now() }
    });
    window.dispatchEvent(event);

    // Notifica listeners locais (se houver)
    const handlers = this.listeners['ledger:transaction-changed'] || [];
    handlers.forEach(handler => handler({ type, transaction }));
  }

  /**
   * Subscribe para ouvir mudanças de transações
   * Usado por componentes para se atualizar
   */
  subscribe(eventName: string, callback: (data: any) => void): () => void {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);

    // Também registra via window.addEventListener para pegar eventos globais
    const eventListener = (event: Event) => {
      if (event instanceof CustomEvent) {
        callback(event.detail);
      }
    };
    window.addEventListener(eventName, eventListener);

    // Retorna função para unsubscribe
    return () => {
      this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
      window.removeEventListener(eventName, eventListener);
    };
  }

  /**
   * Notifica mudança em saldo de conta específica
   * Usado para forçar atualização de UI
   */
  notifyAccountBalanceChange(accountId: string): void {
    const newBalance = this.getAccountBalance(accountId);
    console.log(`💰 Ledger: Saldo atualizado da conta ${accountId} = ${newBalance}`);
    
    const event = new CustomEvent('ledger:balance-changed', {
      detail: { accountId, newBalance, timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }

  /**
   * Limpa todos os listeners (para limpeza/testes)
   */
  clearListeners(): void {
    this.listeners = {};
  }
}

// Singleton
export const ledgerService = new LedgerService();
