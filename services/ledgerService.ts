
import { Persistence } from './persistence';
import type { BankAccount } from '../modules/Financial/types';
import { supabase } from './supabase';
import { FinancialCache } from './financialCache';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from './sqlCanonicalOps';

const INITIAL_ACCOUNTS: BankAccount[] = [];
const db = new Persistence<BankAccount>('bank_accounts', INITIAL_ACCOUNTS, { useStorage: false });

/**
 * 📊 LEDGER SERVICE (Foundation V2)
 * Fonte Única de Verdade para Saldos Bancários.
 * 
 * Utiliza a coluna 'current_balance' do Supabase, que é atualizada via triggers
 * atômicos no PostgreSQL em cada inserção/deleção de transação.
 */
class LedgerService {
  private listeners: Record<string, ((data: any) => void)[]> = {};
  private _realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

  getAll() { return db.getAll(); }
  getById(id: string) { return db.getById(id); }
  subscribe(callback: (items: BankAccount[]) => void) { return db.subscribe(callback); }

  /**
   * Sincroniza saldos do banco de dados (Triggers).
   */
  async recalculateBalances(): Promise<BankAccount[]> {
    try {

      if (isSqlCanonicalOpsEnabled()) {
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .order('account_name', { ascending: true });

        if (error) throw error;

        if (data) {
          const mapped: BankAccount[] = data.map((row: any) => ({
            id: row.id,
            bankName: row.account_name || row.bank_name || 'Conta',
            owner: row.owner || '',
            agency: row.agency || '',
            accountNumber: row.account_number || '',
            initialBalance: Number(row.initial_balance || 0),
            currentBalance: Number(row.balance || 0),
            allowsNegative: row.allows_negative ?? true,
            type: row.account_type || row.type || 'bank'
          }));

          db.setAll(mapped);
          return mapped;
        }

        return [];
      }

      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('*')
        .order('bank_name', { ascending: true });

      if (error) throw error;

      if (data) {
        const mapped: BankAccount[] = data.map(row => ({
          id: row.id,
          bankName: row.bank_name,
          owner: row.owner,
          agency: row.agency,
          accountNumber: row.account_number,
          initialBalance: row.initial_balance || 0,
          currentBalance: row.current_balance || 0,
          allowsNegative: row.allows_negative_balance ?? true,
          type: row.account_type
        }));

        db.setAll(mapped);
        return mapped;
      }
      return [];
    } catch (err) {
      console.error('[ledgerService] recalculateBalances:', err);
      return [];
    }
  }

  getAccountBalance(id: string): number {
    const acc = db.getById(id);
    return acc ? (acc as any).currentBalance : 0;
  }

  getTotalBalance(): number {
    return db.getAll().reduce((sum, acc) => sum + ((acc as any).currentBalance || 0), 0);
  }

  /**
   * Ativa sincronização em tempo real via Supabase
   */
  startRealtime() {

    const realtimeTable = isSqlCanonicalOpsEnabled() ? 'accounts' : 'contas_bancarias';
    const channelName = `realtime:${realtimeTable}_ledger`;
    sqlCanonicalOpsLog(`ledgerService.startRealtime em tabela ${realtimeTable}`);

    this._realtimeChannel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: realtimeTable }, () => {
        this.recalculateBalances();
      })
      .subscribe();
  }

  stopRealtime() {
    if (this._realtimeChannel) {
      supabase.removeChannel(this._realtimeChannel);
      this._realtimeChannel = null;
    }
  }

  /**
   * Eventos de Transação (Ouvido pela UI)
   */
  onTransactionChange(type: 'add' | 'update' | 'delete', transaction: any): void {

    // Dispara via window para componentes globais
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('ledger:transaction-changed', {
        detail: { type, transaction, timestamp: Date.now() }
      });
      window.dispatchEvent(event);
    }

    // Invalida caches
    FinancialCache.invalidate();

    // Recalcula saldos (atômico)
    this.recalculateBalances();
  }
}

export const ledgerService = new LedgerService();
