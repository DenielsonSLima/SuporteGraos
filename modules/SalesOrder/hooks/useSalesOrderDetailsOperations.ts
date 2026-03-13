import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../hooks/queryKeys';
import { salesService } from '../../../services/salesService';
import { financialActionService } from '../../../services/financialActionService';
import { SalesOrder } from '../types';
import { OrderNote } from '../../PurchaseOrder/types';
import { Loading } from '../../Loadings/types';

/**
 * Calcula stats financeiros de um pedido de venda.
 * SKILL: lógica financeira não deve residir em componentes visuais.
 */
export function useSalesOrderStats(order: SalesOrder, loadings: Loading[], transactions: any[] = []) {
  return useMemo(() => {
    const active = loadings.filter(l => l.status !== 'canceled');
    const totalDeliveredVal = active.filter(l => (l.unloadWeightKg || 0) > 0).reduce((acc, l) => acc + (l.totalSalesValue || 0), 0);
    const totalTransitVal = active.filter(l => !(l.unloadWeightKg || 0)).reduce((acc, l) => acc + (l.weightSc * (l.salesPrice || order.unitPrice || 0)), 0);

    // Confia no total recebido vindo do SQL (v2)
    const totalReceived = order.paidValue || 0;

    return { totalDeliveredVal, totalTransitVal, totalReceived, balance: Math.max(0, totalDeliveredVal - totalReceived) };
  }, [loadings, order, transactions]);
}

/**
 * Hook de navegação cross-módulo via CustomEvent.
 * Centraliza o padrão de navegação para evitar uso direto de window em componentes.
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

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SALES_ORDERS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOADINGS });
    queryClient.invalidateQueries({ queryKey: ['sales_order_transactions'] });
  };

  const confirmReceipt = async (orderId: string, data: any) => {
    await financialActionService.processRecord(`so-${orderId}`, data, 'sales_order');
    refreshData();
  };

  const saveNote = async (order: SalesOrder, note: OrderNote) => {
    await salesService.update({ ...order, notesList: [note, ...(order.notesList || [])] });
    refreshData();
  };

  return {
    refreshData,
    confirmReceipt,
    saveNote,
  };
}