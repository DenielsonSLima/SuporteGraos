// modules/PurchaseOrder/hooks/usePurchaseOrderModule.ts
// ============================================================================
// Hook que encapsula lógica de serviço do PurchaseOrderModule
// SKIL: TSX NÃO deve importar services diretamente
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PurchaseOrder } from '../types';
import { purchaseService } from '../../../services/purchaseService';
import { loadingService } from '../../../services/loadingService';
import { authService } from '../../../services/authService';
import { useShareholders } from '../../../hooks/useShareholders';
import { QUERY_KEYS } from '../../../hooks/queryKeys';

interface UsePurchaseOrderModuleOptions {
  addToast: (type: string, title: string, message?: string) => void;
}

export function usePurchaseOrderModule({ addToast }: UsePurchaseOrderModuleOptions) {
  const queryClient = useQueryClient();
  const { data: shareholdersRaw = [] } = useShareholders();
  const shareholders = shareholdersRaw.map(s => ({ id: s.id, name: s.name }));
  const [, setLoadingVersion] = useState(0);

  const generateUuid = useCallback(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
  }, []);

  // ─── Inicialização de serviços legados ──────────────────
  useEffect(() => {
    const user = authService.getCurrentUser();
    const activeCompanyId = user?.companyId;

    if (activeCompanyId) {
      loadingService.startRealtime();
      purchaseService.startRealtime(activeCompanyId);
      void loadingService.loadFromSupabase();
    }

    const unsubscribeLoadings = loadingService.subscribe(() => {
      setLoadingVersion(v => v + 1);
    });

    return () => {
      unsubscribeLoadings?.();
      loadingService.stopRealtime();
      purchaseService.stopRealtime();
    };
  }, []);

  // ─── Invalidar queries ─────────────────────────────────
  const invalidateOrders = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS });
  }, [queryClient]);

  // ─── Buscar pedido por ID ──────────────────────────────
  const getOrderById = useCallback((id: string): PurchaseOrder | undefined => {
    return purchaseService.getById(id);
  }, []);

  // ─── Salvar pedido (criar ou atualizar) ────────────────
  const handleSave = useCallback(async (order: PurchaseOrder, isEditing: boolean): Promise<{ success: boolean; newOrder?: PurchaseOrder }> => {
    if (isEditing) {
      const result = await purchaseService.update(order);
      if (!result?.success) {
        addToast('error', 'Erro ao atualizar pedido', result?.error || 'Falha ao salvar no banco de dados.');
        return { success: false };
      }
      invalidateOrders();
      addToast('success', 'Pedido Atualizado');
      return { success: true, newOrder: order };
    } else {
      const newId = generateUuid();
      const newOrder = { ...order, id: newId };
      const result = await purchaseService.add(newOrder);
      if (!result?.success) {
        addToast('error', 'Erro ao criar pedido', result?.error || 'Falha ao salvar no banco de dados.');
        return { success: false };
      }
      invalidateOrders();
      addToast('success', 'Pedido Criado');
      return { success: true, newOrder };
    }
  }, [addToast, generateUuid, invalidateOrders]);

  // ─── Excluir pedido ───────────────────────────────────
  const executeDelete = useCallback(async (orderId: string): Promise<boolean> => {
    const result = await purchaseService.delete(orderId);
    if (result?.success) {
      addToast('success', 'Pedido Excluído', 'Pedido, pagamentos e contas a pagar removidos com sucesso.');
      invalidateOrders();
      return true;
    } else {
      addToast('error', 'Erro ao Excluir', result?.error || 'Falha ao excluir pedido no banco de dados.');
      return false;
    }
  }, [addToast, invalidateOrders]);

  // ─── Finalizar pedido ──────────────────────────────────
  const finalizeOrder = useCallback(async (orderId: string): Promise<PurchaseOrder | null> => {
    const freshOrder = purchaseService.getById(orderId);
    if (freshOrder) {
      const updated = { ...freshOrder, status: 'completed' as const };
      await purchaseService.update(updated);
      invalidateOrders();
      addToast('success', 'Pedido Finalizado');
      return updated;
    } else {
      addToast('error', 'Erro ao finalizar', 'Pedido não encontrado.');
      return null;
    }
  }, [addToast, invalidateOrders]);

  return {
    shareholders,
    getOrderById,
    handleSave,
    executeDelete,
    finalizeOrder,
  };
}
