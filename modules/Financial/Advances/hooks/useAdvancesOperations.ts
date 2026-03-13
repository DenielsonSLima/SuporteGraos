// modules/Financial/Advances/hooks/useAdvancesOperations.ts
// ============================================================================
// Hook que encapsula lógica de serviço do AdvancesTab
// SKIL: TSX NÃO deve importar services diretamente
// ============================================================================

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { advancesService } from '../../../../services/advancesService';
import { assetService } from '../../../../services/assetService';
import { QUERY_KEYS } from '../../../../hooks/queryKeys';
import type { AdvanceTransaction } from '../types';

interface UseAdvancesOperationsOptions {
  addToast: (type: string, title: string, message?: string) => void;
}

export function useAdvancesOperations({ addToast }: UseAdvancesOperationsOptions) {
  const queryClient = useQueryClient();

  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADVANCES });
  }, [queryClient]);

  // ─── Registrar novo adiantamento ────────────────────────
  const handleSaveAdvance = useCallback(async (data: any) => {
    try {
      await advancesService.create({
        recipientId: data.partnerId,
        recipientType: data.type === 'given' ? 'supplier' : 'client',
        amount: data.value,
        accountId: data.accountId,
        description: data.description,
        advanceDate: data.date,
      });
      refreshData();
      addToast('success', 'Adiantamento Registrado');
    } catch (err: any) {
      addToast('error', 'Erro ao registrar adiantamento', err.message);
    }
  }, [addToast, refreshData]);

  // ─── Realizar baixa ────────────────────────────────────
  const handleConfirmSettle = useCallback(async (data: any, txToSettle: AdvanceTransaction) => {
    try {
      // Se for ativo patrimonial, registrar no módulo de ativos
      if (data.isAsset && data.assetName) {
        assetService.add({
          id: crypto.randomUUID(),
          name: data.assetName,
          type: 'other',
          status: 'active',
          acquisitionDate: data.date,
          acquisitionValue: data.amount,
          origin: 'trade_in',
          originDescription: `Recebido de ${txToSettle.partnerName} p/ quitar adiantamento`
        });
      }

      // Cria adiantamento reverso via RPC
      await advancesService.create({
        recipientId: txToSettle.partnerId,
        recipientType: txToSettle.type === 'given' ? 'client' : 'supplier',
        amount: data.amount,
        accountId: data.accountId,
        description: `Quitação parcial/total - ${txToSettle.partnerName}`,
        advanceDate: data.date,
        parentId: txToSettle.id,
      });

      refreshData();
      addToast('success', 'Baixa Realizada');
    } catch (err: any) {
      addToast('error', 'Erro ao realizar baixa', err.message);
    }
  }, [addToast, refreshData]);

  return {
    refreshData,
    handleSaveAdvance,
    handleConfirmSettle,
  };
}
