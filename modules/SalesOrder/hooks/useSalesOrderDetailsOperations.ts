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
    // Confia 100% nos dados pré-calculados pelo SQL (VIEW vw_sales_orders_enriched)
    // Isso garante consistência absoluta com os relatórios e dashboard
    const totalDeliveredVal = order.deliveredValue || 0;
    const totalTransitVal = order.transitValue || 0;
    const totalReceived = order.paidValue || 0;
    
    // Novo cálculo solicitado: Valor Faturado/Entregue - Valor Recebido
    // Evita saldo pendente do contrato total antes da entrega
    const balance = Math.max(0, totalDeliveredVal - totalReceived);
    const contractBalance = order.balanceValue || 0;

    return { 
      totalDeliveredVal, 
      totalTransitVal, 
      totalReceived, 
      balance,
      contractBalance
    };
  }, [order]);
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

  const refreshData = async () => {
    // Await all invalidations to ensure TanStack is ready before next UI action
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SALES_ORDERS }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOADINGS }),
      queryClient.invalidateQueries({ queryKey: ['sales_order_transactions'] }),
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
    saveNote,
  };
}