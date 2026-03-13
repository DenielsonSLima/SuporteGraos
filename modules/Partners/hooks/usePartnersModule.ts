// modules/Partners/hooks/usePartnersModule.ts
// ============================================================================
// Hook que encapsula lógica de serviço do módulo Parceiros
// SKILL: TSX NÃO deve importar services diretamente
// ============================================================================
//
// FIXED (SKILL §3.6 + §8.4): O cálculo de saldos agora é feito via RPC no banco
// (rpc.get_partner_balances), respeitando a regra "Saldo Sagrado".
// ============================================================================

import { useMemo, useCallback, useState, useEffect } from 'react';
import { partnersService } from '../partners.service';
import { authService } from '../../../services/authService';
import type { Partner } from '../partners.types';

interface UsePartnersModuleOptions {
  partners: Partner[];
  balancesTick: number;
}

/**
 * Hook para buscar saldos consolidados dos parceiros via RPC
 * e operação de salvar endereço.
 */
export function usePartnersModule({ partners, balancesTick }: UsePartnersModuleOptions) {
  const [partnerBalances, setPartnerBalances] = useState<Record<string, { credit: number; debit: number; net: number }>>({});

  // ─── Busca de saldos consolidados via RPC ─────────────────
  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const companyId = authService.getCurrentUser()?.companyId;
        if (!companyId) return;

        const balances = await partnersService.getPartnerBalances(companyId);

        const balanceMap: Record<string, { credit: number; debit: number; net: number }> = {};
        balances.forEach((b: any) => {
          balanceMap[b.partner_id] = {
            credit: Number(b.total_receivable) + Number(b.total_advances),
            debit: Number(b.total_payable),
            net: Number(b.net_balance),
          };
        });

        setPartnerBalances(balanceMap);
      } catch (err) {
        console.error('[usePartnersModule] Erro ao buscar saldos via RPC:', err);
      }
    };

    fetchBalances();
  }, [balancesTick]);

  // ─── Salvar endereço do parceiro (Atalho legado/simples) ───
  const savePartnerAddress = useCallback(async (partnerId: string, address: any) => {
    await partnersService.savePartnerAddress(partnerId, address);
  }, []);

  return {
    partnerBalances,
    savePartnerAddress,
  };
}
