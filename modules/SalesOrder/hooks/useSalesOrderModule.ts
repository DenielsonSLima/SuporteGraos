/**
 * useSalesOrderModule.ts
 *
 * Hook co-localizado que encapsula TODA lógica de negócio do SalesOrderModule:
 * - salesService (CRUD + getById)
 * - loadingService (verificação de carregamentos vinculados)
 * - shareholderService → substituído por useShareholders()
 *
 * SKIL: TSX não importa services diretamente.
 */

import { useSalesOrders } from '../../../hooks/useSalesOrders';
import { useShareholders } from '../../../hooks/useShareholders';
import { SalesOrder } from '../types';
import { salesService } from '../../../services/salesService';
import { loadingService } from '../../../services/loadingService';
import { SalesLoadParams } from '../../../services/sales/loader';

export function useSalesOrderModule(params: SalesLoadParams = {}) {
  const { data: salesResult, isLoading, isFetching } = useSalesOrders(params);
  const sales = salesResult?.data ?? [];
  const totalCount = salesResult?.count ?? 0;
  const { data: shareholdersRaw = [] } = useShareholders();

  // Mapeia sócios para formato leve (id + name)
  const shareholders = shareholdersRaw.map(s => ({ id: s.id, name: s.name }));

  // Busca pedido por ID — tenta cache TanStack primeiro, fallback no service
  const getOrderById = (id: string): SalesOrder | undefined =>
    sales.find(o => o.id === id) ?? salesService.getById(id);

  // Verifica carregamentos vinculados a um pedido de venda
  const getLinkedLoadings = (salesOrderId: string) =>
    loadingService.getBySalesOrder(salesOrderId);

  // Salva pedido (cria ou atualiza)
  const saveOrder = async (order: SalesOrder, isUpdate: boolean) => {
    if (isUpdate) {
      return salesService.update(order);
    }
    return salesService.add(order);
  };

  // Exclui pedido
  const deleteOrder = async (orderId: string) => {
    return salesService.delete(orderId);
  };

  // Finaliza pedido (status → completed)
  const finalizeOrder = async (orderId: string) => {
    const freshOrder = getOrderById(orderId);
    if (!freshOrder) return null;
    const updated = { ...freshOrder, status: 'completed' as const };
    await salesService.update(updated);
    return updated;
  };

  // Reabre pedido (status → approved)
  const reopenOrder = async (orderId: string) => {
    const freshOrder = getOrderById(orderId);
    if (!freshOrder) return null;
    const updated = { ...freshOrder, status: 'approved' as const };
    await salesService.update(updated);
    return updated;
  };

  // Cancela pedido (status → canceled) e limpa financeiro via RPC
  const cancelOrder = async (orderId: string, reason?: string) => {
    return salesService.cancel(orderId, reason);
  };

  return {
    sales,
    shareholders,
    totalCount,
    isLoading,
    isFetching,
    getOrderById,
    getLinkedLoadings,
    saveOrder,
    deleteOrder,
    finalizeOrder,
    reopenOrder,
    cancelOrder,
  };
}
