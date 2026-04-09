/**
 * useAssetKPIs.ts
 *
 * Hook que centraliza os cálculos de indicadores do módulo Patrimônio.
 *
 * REGRA: "Frontend não faz cálculo crítico" (SKILL §5.4, §7.2)
 *
 * Antes: .reduce() e aritmética financeira espalhados em:
 *   - AssetKPIs.tsx (3x .reduce())
 *   - AssetDetails.tsx (stats useMemo com .reduce())
 *
 * Agora centralizado aqui, pronto para ser substituído por uma RPC
 * (ex: rpc_asset_kpis(company_id)) quando disponível no banco.
 *
 * TODO: Migrar para RPC no PostgreSQL que retorne:
 *   { totalFixedValue, totalSoldOpen, totalPendingReceipt, activeCount, soldCount }
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { assetKpiService } from '../../../services/assetKpiService';
import { authService } from '../../../services/authService';
import type { Asset } from '../types';
import type { FinancialRecord } from '../../Financial/types';

export interface AssetKPIData {
  /** Valor total dos bens com status 'active' (aquisição) */
  totalFixedValue: number;
  /** Valor total negociado em vendas com parcelas pendentes */
  totalSoldOpen: number;
  /** Soma de remainingValue dos recebíveis de bens vendidos */
  totalPendingReceipt: number;
  /** Quantidade de bens ativos */
  activeCount: number;
  /** Quantidade de bens vendidos com pendências */
  soldCount: number;
}

export interface AssetDetailStats {
  /** Valor total da venda */
  totalSold: number;
  /** Valor já recebido */
  totalReceived: number;
  /** Valor ainda pendente */
  totalPending: number;
  /** Percentual de progresso do recebimento */
  progress: number;
}

/**
 * KPIs gerais do módulo patrimônio (lista de ativos).
 * Centralizado no Banco de Dados via RPC.
 */
export function useAssetKPIs(_assets: Asset[] = []): AssetKPIData {
  const user = authService.getCurrentUser();
  const companyId = user?.companyId || '';

  const { data } = useQuery({
    queryKey: ['assets', 'summary', companyId],
    queryFn: () => assetKpiService.getSummary(companyId),
    enabled: !!companyId,
    staleTime: 30000, // 30 segundos
  });

  return data || {
    totalFixedValue: 0,
    totalSoldOpen: 0,
    totalPendingReceipt: 0,
    activeCount: 0,
    soldCount: 0,
  };
}

/**
 * Stats detalhados de um ativo específico (tela de detalhes).
 * Centralizado no Banco de Dados via RPC.
 */
export function useAssetDetailStats(asset: Asset, _financialHistory: FinancialRecord[] = []): AssetDetailStats {
  const { data } = useQuery({
    queryKey: ['assets', 'detail-stats', asset.id],
    queryFn: () => assetKpiService.getDetailStats(asset.id),
    enabled: !!asset.id,
    staleTime: 15000,
  });

  const fallback = useMemo(() => {
    const totalSold = asset.saleValue || 0;
    return { totalSold, totalReceived: 0, totalPending: totalSold, progress: 0 };
  }, [asset]);

  return data || fallback;
}
