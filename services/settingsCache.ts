import { bankAccountService } from './bankAccountService';
import { BankAccount } from '../modules/Financial/types';
import { ledgerService } from './ledgerService';

export type BankAccountWithBalance = BankAccount & { currentBalance: number };

/**
 * 🏦 SettingsCache - Cache para configurações do sistema
 * 
 * PROBLEMA IDENTIFICADO:
 * - 27+ componentes chamando getBankAccounts()/getBankAccountsWithBalances()
 * - Cada modal de pagamento lê contas do zero
 * - Formulários recarregam listas repetidamente
 * 
 * IMPACTO:
 * - Pedidos de Compra: 3-5 leituras por tela
 * - Pedidos de Venda: 2-4 leituras
 * - Financeiro: 5-8 leituras (múltiplas abas)
 * - Carregamentos: 2-3 leituras
 * 
 * SOLUÇÃO:
 * Cache de 60s - configurações mudam raramente
 * Invalidação manual após cadastro/edição
 */

type CachedSettings = {
  bankAccounts: BankAccount[];
  bankAccountsWithBalances: BankAccountWithBalance[];
  timestamp: number;
};

export class SettingsCache {
  private static cache: CachedSettings | null = null;
  private static readonly TTL = 60_000; // 60 segundos

  private static calculateBalances(): BankAccountWithBalance[] {
    const accounts = ledgerService.getAll();
    return accounts.map((acc: any) => ({
      ...acc,
      currentBalance: acc.currentBalance || 0
    }));
  }

  private static load(): void {
    const startTime = performance.now();

    this.cache = {
      bankAccounts: bankAccountService.getBankAccounts(),
      bankAccountsWithBalances: this.calculateBalances(),
      timestamp: Date.now()
    };
  }

  private static isValid(): boolean {
    if (!this.cache) return false;
    return (Date.now() - this.cache.timestamp) < this.TTL;
  }

  static getBankAccounts(): BankAccount[] {
    if (!this.isValid()) this.load();
    return this.cache!.bankAccounts;
  }

  static getBankAccountsWithBalances(): BankAccountWithBalance[] {
    if (!this.isValid()) this.load();
    return this.cache!.bankAccountsWithBalances;
  }

  static invalidate(): void {
    this.cache = null;
  }

  static refreshBalances(): void {
    // Apenas recarrega saldos, mantém lista de contas
    if (this.cache) {
      this.cache.bankAccountsWithBalances = this.calculateBalances();
    }
  }
}

// Listeners para invalidar cache quando configurações mudarem
if (typeof window !== 'undefined') {
  window.addEventListener('settings:updated', () => SettingsCache.invalidate());
  window.addEventListener('financial:updated', () => SettingsCache.refreshBalances());
}

export const invalidateSettingsCache = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('settings:updated'));
  }
};
