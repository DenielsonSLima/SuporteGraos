// modules/Partners/hooks/usePartnersModule.ts
// ============================================================================
// Hook que encapsula lógica de serviço do módulo Parceiros
// SKILL: TSX NÃO deve importar services diretamente
// ============================================================================
//
// TODO (SKILL §3.6 + §8.4): O cálculo de saldos consolidados (partnerBalances)
// abaixo viola a regra "Saldo Sagrado" — deveria ser uma VIEW ou RPC no banco
// (ex: vw_partner_balances ou rpc.get_partner_balances). Manter aqui como
// solução transitória até a migração para o banco.
// ============================================================================

import { useMemo, useCallback } from 'react';
import { parceirosService } from '../../../services/parceirosService';
import { financialIntegrationService } from '../../../services/financialIntegrationService';
import { advanceService } from '../../Financial/Advances/services/advanceService';
import type { Partner, SavePartnerData } from '../partners.types';

interface UsePartnersModuleOptions {
  partners: Partner[];
  balancesTick: number;
}

/**
 * Hook para cálculo de saldos consolidados dos parceiros
 * e operação de salvar endereço.
 */
export function usePartnersModule({ partners, balancesTick }: UsePartnersModuleOptions) {
  // ─── Cálculo de saldos consolidados ─────────────────────
  const partnerBalances = useMemo(() => {
    try {
    const payables = financialIntegrationService.getPayables();
    const receivables = financialIntegrationService.getReceivables();
    const advances = advanceService.getSummaries();

    const balanceMap: Record<string, { credit: number; debit: number; net: number }> = {};

    partners.forEach(p => {
      let credit = 0;
      let debit = 0;

      // 1. Débitos (Pagar)
      const pPay = payables.filter(r => r.entityName === p.name);
      debit += pPay.reduce((acc, r) => acc + (r.originalValue - r.paidValue - (r.discountValue || 0)), 0);

      // 2. Créditos (Receber)
      const pRec = receivables.filter(r => r.entityName === p.name);
      credit += pRec.reduce((acc, r) => acc + (r.originalValue - r.paidValue - (r.discountValue || 0)), 0);

      // 3. Adiantamentos
      const pAdv = advances.find(s => s.partnerId === p.id || s.partnerName === p.name);
      if (pAdv) {
        if (pAdv.netBalance > 0) credit += pAdv.netBalance;
        else debit += Math.abs(pAdv.netBalance);
      }

      balanceMap[p.id] = {
        credit,
        debit,
        net: credit - debit,
      };
    });

    return balanceMap;
    } catch (err) {
      console.error('[usePartnersModule] Erro ao calcular saldos:', err);
      return {} as Record<string, { credit: number; debit: number; net: number }>;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partners, balancesTick]);

  // ─── Salvar endereço do parceiro ────────────────────────
  const savePartnerAddress = useCallback(async (partnerId: string, address: any) => {
    await parceirosService.savePartnerAddress(partnerId, address);
  }, []);

  return {
    partnerBalances,
    savePartnerAddress,
  };
}
