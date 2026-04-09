import { supabase } from '../supabase';
import { SalesOrder } from '../../modules/SalesOrder/types';
import { salesStore } from './store';
import { salesLoader } from './loader';
import { salesCanonical } from './canonical';
import { salesTransactions } from './transactions';
import { mapOrderToDb } from './mappers';
import { logService } from '../logService';
import { auditService } from '../auditService';
import { isSqlCanonicalOpsEnabled } from '../sqlCanonicalOps';
import { DashboardCache, invalidateDashboardCache } from '../dashboardCache';
import { invalidateFinancialCache } from '../financialCache';
import { loadingService } from '../loadingService';
import { financialHistoryService } from '../financial/financialHistoryService';
import { ledgerService } from '../ledgerService';

/**
 * SALES ACTIONS
 * Implementa as operações de criação, atualização e exclusão de Pedidos de Venda.
 */

const getLogInfo = async () => {
  const { authService } = await import('../authService');
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema', companyId: user?.companyId };
};

const persistUpsert = async (order: SalesOrder) => {
  // Se estiver em modo canônico, o salvamento via RPC na salesCanonical já deve ter ocorrido.
  // Este método é o fallback para o modo legado.
  if (isSqlCanonicalOpsEnabled()) return { success: true };

  try {
    const { companyId } = await getLogInfo();
    if (!companyId) return { success: false, error: 'Empresa não identificada' };

    const payload = mapOrderToDb(order);
    const isValidUuid = (v?: string) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
    if (!isValidUuid(payload.id)) {
      (payload as any).id = undefined;
    }

    const { error } = await supabase.from('ops_sales_orders').upsert(payload).select();
    if (error) return { success: false, error: error.message };
    
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado' };
  }
};

export const salesActions = {
  add: async (sale: SalesOrder) => {
    // 1. MODO CANÔNICO (SQL-First)
    if (isSqlCanonicalOpsEnabled()) {
      const result = await salesCanonical.upsert(sale);
      if (!result.success) return result;
      
      salesStore.add(sale);
      const { userId, userName } = await getLogInfo();
      logService.addLog({ userId, userName, action: 'create', module: 'Vendas', description: `Criou Pedido de Venda ${sale.number}`, entityId: sale.id });
      void auditService.logAction('create', 'Vendas', `Pedido de venda criado: #${sale.number}`, { entityId: sale.id });
      invalidateDashboardCache();
      return { success: true };
    }

    // 2. MODO LEGADO
    const result = await persistUpsert(sale);
    if (!result.success) return result;

    salesStore.add(sale);
    
    const { userId, userName } = await getLogInfo();
    logService.addLog({ userId, userName, action: 'create', module: 'Vendas', description: `Criou Pedido de Venda ${sale.number}`, entityId: sale.id });
    
    void auditService.logAction('create', 'Vendas', `Pedido de venda criado: #${sale.number} - ${sale.customerName}`, {
      entityId: sale.id,
      metadata: { totalValue: sale.totalValue, status: sale.status }
    });

    invalidateDashboardCache();
    return { success: true };
  },

  update: async (updatedSale: SalesOrder) => {
    // 1. MODO CANÔNICO (SQL-First)
    if (isSqlCanonicalOpsEnabled()) {
      const result = await salesCanonical.upsert(updatedSale);
      if (!result.success) return result;

      salesStore.update(updatedSale);
      const { userId, userName } = await getLogInfo();
      logService.addLog({ userId, userName, action: 'update', module: 'Vendas', description: `Atualizou Pedido de Venda ${updatedSale.number}`, entityId: updatedSale.id });
      invalidateDashboardCache();
      return { success: true };
    }

    // 2. MODO LEGADO
    const result = await persistUpsert(updatedSale);
    if (!result.success) return result;

    const oldSale = salesStore.get().find(s => s.id === updatedSale.id);
    salesStore.update(updatedSale);

    // ✅ DETECÇÃO DE MUDANÇAS FINANCEIRAS (Histórico) - Apenas Legado
    if (oldSale) {
      await salesActions.processFinancialHistory(oldSale, updatedSale);
    }

    const { userId, userName } = await getLogInfo();
    let action = 'update';
    let desc = `Atualizou Pedido de Venda ${updatedSale.number}`;

    if (oldSale && oldSale.status !== updatedSale.status) {
      if (updatedSale.status === 'approved') { action = 'approve'; desc = `Aprovou Pedido de Venda ${updatedSale.number}`; }
      else if (updatedSale.status === 'completed') { action = 'finalize'; desc = `Finalizou Pedido de Venda ${updatedSale.number}`; }
    }

    logService.addLog({ userId, userName, action: action as any, module: 'Vendas', description: desc, entityId: updatedSale.id });
    void auditService.logAction(action as any, 'Vendas', `Pedido de venda: #${updatedSale.number} - ${desc}`, {
      entityId: updatedSale.id,
      metadata: { status: updatedSale.status, totalValue: updatedSale.totalValue }
    });

    invalidateDashboardCache();
    return { success: true };
  },

  remove: async (id: string) => {
    const order = salesStore.get().find(o => o.id === id);
    if (!order) return { success: false, error: 'Pedido não encontrado' };

    const linkedLoadings = loadingService.getBySalesOrder(id);
    if (linkedLoadings.length > 0) {
      return { success: false, error: `Não é possível excluir este pedido pois existem ${linkedLoadings.length} carregamentos vinculados.` };
    }

    const canonicalDeleted = await salesCanonical.delete(id);
    const canonicalAuthoritative = isSqlCanonicalOpsEnabled() && canonicalDeleted;

    if (!canonicalAuthoritative) {
      await salesTransactions.cleanupFinancials(id);
      const { error } = await supabase.from('sales_orders').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
    }

    salesStore.delete(id);
    const { userId, userName } = await getLogInfo();
    logService.addLog({ userId, userName, action: 'delete', module: 'Vendas', description: `Excluiu Pedido de Venda ${order.number}`, entityId: id });
    
    DashboardCache.clearAll();
    invalidateDashboardCache();
    invalidateFinancialCache();
    return { success: true };
  },

  cancel: async (id: string, reason?: string) => {
    try {
      const { data: result, error } = await supabase.rpc('rpc_ops_order_cancel', {
        p_order_id: id,
        p_order_type: 'sales',
        p_reason: reason || 'Cancelamento via painel'
      });

      if (error || (result && !result.success)) {
        return { success: false, error: error?.message || result?.error || 'Erro ao cancelar pedido' };
      }

      // Invalidação Imediata
      invalidateDashboardCache();
      invalidateFinancialCache();
      salesLoader.loadFromSupabase(); // Força recarga do store local legado

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro inesperado' };
    }
  },

  processFinancialHistory: async (oldSale: SalesOrder, updatedSale: SalesOrder) => {
    const oldTxs = oldSale.transactions || [];
    const newTxs = updatedSale.transactions || [];

    const newReceipts = newTxs.filter(t => (t.type === 'receipt') && !oldTxs.some(old => old.id === t.id));
    for (const tx of newReceipts) {
      if (tx.value > 0) {
        const accId = tx.accountId;
        const currentBalance = accId ? ledgerService.getAccountBalance(accId) : 0;
        await financialHistoryService.add({
          id: `fh-${tx.id}`,
          date: tx.date,
          type: 'Receita Operacional',
          operation: 'inflow',
          amount: tx.value,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance + tx.value,
          bankAccountId: accId,
          description: `Recebimento Venda #${updatedSale.number}`,
          partnerId: updatedSale.customerId,
          referenceType: 'sales_order',
          referenceId: updatedSale.id,
          notes: tx.notes
        });
      }
    }

    const removedReceipts = oldTxs.filter(t => (t.type === 'receipt') && !newTxs.some(newTx => newTx.id === t.id));
    for (const tx of removedReceipts) {
      if (tx.value > 0) {
        const accId = tx.accountId;
        const currentBalance = accId ? ledgerService.getAccountBalance(accId) : 0;
        await financialHistoryService.add({
          id: `fh-rev-${tx.id}`,
          date: new Date().toISOString(),
          type: 'Estorno de Receita',
          operation: 'outflow',
          amount: tx.value,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance - tx.value,
          bankAccountId: accId,
          description: `Estorno Recebimento Venda #${updatedSale.number}`,
          partnerId: updatedSale.customerId,
          referenceType: 'sales_order',
          referenceId: updatedSale.id,
          notes: `Estorno de transação original: ${tx.notes || ''}`
        });
      }
    }
  },

  updateTransaction: (orderId: string, updatedTx: any) => 
    salesTransactions.updateTransaction(orderId, updatedTx, persistUpsert),
  
  deleteTransaction: (orderId: string, txId: string) => 
    salesTransactions.deleteTransaction(orderId, txId, persistUpsert),

  reload: () => salesLoader.loadFromSupabase()
};
