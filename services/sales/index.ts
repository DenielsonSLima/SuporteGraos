import { salesStore } from './store';
import { salesLoader } from './loader';
import { salesActions } from './actions';
import { salesRealtime } from './realtime';
import { SalesOrder, SalesTransaction } from '../../modules/SalesOrder/types';

/**
 * SALES SERVICE (Modular)
 * Este é o ponto de entrada único para operações de Pedidos de Venda.
 */

export const salesService = {
  // State & Subscriptions
  getAll: () => salesStore.get(),
  getById: (id: string) => salesStore.get().find(s => s.id === id),
  subscribe: (callback: (items: SalesOrder[]) => void) => salesStore.subscribe(callback),

  // Loading
  loadFromSupabase: (params?: any) => 
    salesLoader.loadFromSupabase(params),
  reload: () => salesLoader.loadFromSupabase({}),

  // Actions
  add: (sale: SalesOrder) => salesActions.add(sale),
  update: (updatedSale: SalesOrder) => salesActions.update(updatedSale),
  delete: (id: string) => salesActions.remove(id),
  cancel: (id: string, reason?: string) => salesActions.cancel(id, reason),
  
  // Realtime
  startRealtime: (companyId: string) => salesRealtime.start(companyId),
  stopRealtime: () => salesRealtime.stop(),

  // Transactions
  updateTransaction: (orderId: string, updatedTx: SalesTransaction) => 
    salesActions.updateTransaction(orderId, updatedTx),
  
  deleteTransaction: (orderId: string, txId: string) => 
    salesActions.deleteTransaction(orderId, txId),

  // Utility
  importData: (data: SalesOrder[]) => {
    salesStore.setAll(data);
  },

  getStats: (companyId: string) => salesLoader.loadStats(companyId)
};
