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
    // 🚀 FORÇAR REFETCH (SKIL: Zero Lag UI)
    // Usamos refetchQueries({ type: 'active' }) para garantir que o que está na tela atualize IMEDIATAMENTE.
    await Promise.allSettled([
      queryClient.refetchQueries({ queryKey: [QUERY_KEYS.SALES_ORDERS, orderId], type: 'active' }),
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.SALES_ORDERS, type: 'active' }),
      queryClient.refetchQueries({ queryKey: ['sales_order_transactions', orderId], type: 'active' }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOADINGS }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CASHIER_CURRENT }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_ENTRIES })
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