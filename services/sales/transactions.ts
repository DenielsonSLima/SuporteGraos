import { supabase } from '../supabase';
import { SalesOrder, SalesTransaction } from '../../modules/SalesOrder/types';
import { salesStore } from './store';
import { salesCanonical } from './canonical';
import { logService } from '../logService';
import { financialTransactionService } from '../financial/financialTransactionService';
import { receivablesService } from '../financial/receivablesService';
import { isSqlCanonicalOpsEnabled } from '../sqlCanonicalOps';

/**
 * SALES TRANSACTIONS
 * Gerencia a limpeza financeira e atualizações de transações associadas aos pedidos de venda.
 */

const getLogInfo = async () => {
  const { authService } = await import('../authService');
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

export const salesTransactions = {
  updateTransaction: async (orderId: string, updatedTx: SalesTransaction, persistFn: (order: SalesOrder) => Promise<any>) => {
    const order = salesStore.get().find(o => o.id === orderId);
    if (!order) return;

    if (updatedTx.type === 'receipt') {
      await financialTransactionService.add({
        date: updatedTx.date,
        description: `Recebimento Venda #${order.number} (Editado)`,
        amount: updatedTx.value,
        type: 'receipt',
        bankAccountId: updatedTx.accountId,
        companyId: (order as any).companyId || ''
      });
    }

    const newTxs = (order.transactions || []).map(t => t.id === updatedTx.id ? updatedTx : t);
    
    // ✅ RECALCULAR VALORES FINANCEIROS (paidValue / balanceValue)
    const newPaidValue = newTxs.filter(t => t.type === 'receipt').reduce((acc, t) => acc + (t.value || 0), 0);
    const newBalanceValue = Math.max(0, (order.totalValue || 0) - newPaidValue);

    const updated = { 
      ...order, 
      transactions: newTxs,
      paidValue: newPaidValue,
      balanceValue: newBalanceValue
    };
    
    salesStore.update(updated);
    
    // ✅ PERSISTÊNCIA UNIFICADA
    if (isSqlCanonicalOpsEnabled()) {
      await salesCanonical.upsert(updated);
    } else {
      await persistFn(updated);
    }

    const { userId, userName } = await getLogInfo();
    logService.addLog({ userId, userName, action: 'update', module: 'Financeiro', description: `Editou recebimento na Venda ${order.number}`, entityId: orderId });
  },

  deleteTransaction: async (orderId: string, txId: string, persistFn: (order: SalesOrder) => Promise<any>) => {
    const order = salesStore.get().find(o => o.id === orderId);
    if (!order) return;

    const { removeFinancialTransaction } = await import('../financial/paymentOrchestrator');
    await removeFinancialTransaction(txId);

    const newTxs = (order.transactions || []).filter(t => t.id !== txId);
    
    // ✅ RECALCULAR VALORES FINANCEIROS (paidValue / balanceValue)
    // Isso garante que o dashboard e o card de detalhes atualizem imediatamente após o estorno.
    const newPaidValue = newTxs.filter(t => t.type === 'receipt').reduce((acc, t) => acc + (t.value || 0), 0);
    const newBalanceValue = Math.max(0, (order.totalValue || 0) - newPaidValue);

    const updated = { 
      ...order, 
      transactions: newTxs,
      paidValue: newPaidValue,
      balanceValue: newBalanceValue
    };
    
    salesStore.update(updated);

    // ✅ PERSISTÊNCIA UNIFICADA
    if (isSqlCanonicalOpsEnabled()) {
      await salesCanonical.upsert(updated);
    } else {
      await persistFn(updated);
    }

    const { userId, userName } = await getLogInfo();
    logService.addLog({ userId, userName, action: 'delete', module: 'Financeiro', description: `Estornou recebimento da Venda ${order.number}`, entityId: orderId });
  },

  cleanupFinancials: async (saleId: string) => {
    if (isSqlCanonicalOpsEnabled()) {
      // ✅ SQL-first: delete canônico remove automaticamente vínculos financeiros no banco
      void receivablesService.loadFromSupabase();
      return;
    }

    const allReceivables = receivablesService.getAll();
    const linkedReceivables = allReceivables.filter(r => r.salesOrderId === saleId);
    const receivableIds = linkedReceivables.map(r => r.id);

    try {
      const { cleanupFinancialRecords } = await import('../financial/paymentOrchestrator');
      await cleanupFinancialRecords({
        entityId: saleId,
        entityType: 'sales_order',
        receivableIds
      });

      if (linkedReceivables.length > 0) {
        for (const r of linkedReceivables) {
          receivablesService.delete(r.id);
        }
      }
    } catch (err) {
      console.error('[salesTransactions.cleanupFinancials] Falha na limpeza financeira:', err);
    }
  },

  /**
   * SINCRONIZAR FINANCEIRO
   * Reabre as transações reais do banco e atualiza o metadata do pedido.
   * Útil para recuperar ordens com metadata corrompido ou dessincronizado.
   */
  syncSalesOrderFinancials: async (orderId: string, persistFn: (order: SalesOrder) => Promise<any>) => {
    const order = salesStore.get().find(o => o.id === orderId);
    if (!order) return;

    // 1. Buscar transações reais do banco para este pedido
    const { data: entries } = await supabase
      .from('financial_entries')
      .select('id')
      .eq('origin_id', orderId)
      .eq('origin_type', 'sales_order')
      .limit(1);

    let totalPaid = 0;
    let transactions: SalesTransaction[] = [];

    if (entries && entries.length > 0) {
      const { data: txs } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('entry_id', entries[0].id);

      if (txs) {
        transactions = txs.map(t => ({
          id: t.id,
          value: Number(t.amount),
          date: t.transaction_date,
          type: t.type === 'receipt' || t.type === 'IN' ? 'receipt' : 'payment',
          notes: t.description,
          accountId: t.bank_account_id || t.account_id
        }));
        totalPaid = transactions.filter(t => t.type === 'receipt').reduce((acc, t) => acc + t.value, 0);
      }
    }

    // 2. Atualizar Metadata
    const updated = {
      ...order,
      transactions,
      paidValue: totalPaid,
      balanceValue: Math.max(0, (order.totalValue || 0) - totalPaid)
    };

    salesStore.update(updated);

    // ✅ PERSISTÊNCIA UNIFICADA
    if (isSqlCanonicalOpsEnabled()) {
      await salesCanonical.upsert(updated);
    } else {
      await persistFn(updated);
    }

    const { userId, userName } = await getLogInfo();
    logService.addLog({ userId, userName, action: 'update', module: 'Financeiro', description: `Sincronizou financeiro da Venda ${order.number}`, entityId: orderId });
    
    return updated;
  }
};
