import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../hooks/queryKeys';
import { salesService } from '../../../services/salesService';
import { financialActionService } from '../../../services/financialActionService';
import { SalesOrder } from '../types';
import { OrderNote } from '../../PurchaseOrder/types';

/**
 * Hook de navegação cross-módulo via CustomEvent.
 */
export function useCrossModuleNavigation() {

  const navigateTo = (moduleId: string, orderId: string) => {
    (window as any).__pendingOrderNav = { moduleId, orderId };
    window.dispatchEvent(new CustomEvent('app:navigate', { detail: { moduleId, orderId } }));
  };
  return { navigateTo };
}

export function useSalesOrderDetailsOperations() {
  const queryClient = useQueryClient();

  const refreshData = async (orderId?: string) => {
    // 🚀 OTIMIZAÇÃO: Invalidação granular (SKIL: Performance First)
    const filters = orderId ? { queryKey: [QUERY_KEYS.SALES_ORDERS, orderId] } : { queryKey: QUERY_KEYS.SALES_ORDERS };
    
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: filters.queryKey } as any),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOADINGS }),
      queryClient.invalidateQueries({ queryKey: ['sales_order_transactions', orderId] }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS })
    ]);
  };

  const confirmReceipt = async (orderId: string, data: any) => {
    await financialActionService.processRecord(`so-${orderId}`, data, 'sales_order');
    await refreshData();
  };

  const saveNote = async (order: SalesOrder, note: OrderNote) => {
    await salesService.update({ ...order, notesList: [note, ...(order.notesList || [])] });
    await refreshData();
  };

  return {
    refreshData,
    confirmReceipt,
    saveNote
  };
}