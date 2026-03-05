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
import { useStandaloneRecords } from '../../../hooks/useFinancialActions';
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
 * TODO: substituir por RPC rpc_asset_kpis(company_id)
 */
export function useAssetKPIs(assets: Asset[]): AssetKPIData {
  const { data: standaloneRecords = [] } = useStandaloneRecords();

  return useMemo(() => {
    const activeAssets = assets.filter(a => a.status === 'active');
    const totalFixedValue = activeAssets.reduce((acc, a) => acc + a.acquisitionValue, 0);

    const soldAssetsWithPending = assets.filter(a => {
      if (a.status !== 'sold') return false;
      return standaloneRecords.some((r: FinancialRecord) => r.assetId === a.id && r.status !== 'paid');
    });
    const totalSoldOpen = soldAssetsWithPending.reduce((acc, a) => acc + (a.saleValue || 0), 0);

    const totalPendingReceipt = standaloneRecords
      .filter((r: FinancialRecord) => r.assetId && assets.some(a => a.id === r.assetId && a.status === 'sold'))
      .reduce((acc: number, r: FinancialRecord) => acc + (r.remainingValue || 0), 0);

    return {
      totalFixedValue,
      totalSoldOpen,
      totalPendingReceipt,
      activeCount: activeAssets.length,
      soldCount: soldAssetsWithPending.length,
    };
  }, [assets, standaloneRecords]);
}

/**
 * Stats detalhados de um ativo específico (tela de detalhes).
 * TODO: substituir por RPC rpc_asset_detail_stats(asset_id)
 */
export function useAssetDetailStats(asset: Asset, financialHistory: FinancialRecord[]): AssetDetailStats {
  return useMemo(() => {
    const totalSold = asset.saleValue || 0;
    const totalReceived = financialHistory.reduce((acc, r) => acc + r.paidValue, 0);
    const totalPending = Math.max(0, totalSold - totalReceived);
    const progress = totalSold > 0 ? (totalReceived / totalSold) * 100 : 0;
    return { totalSold, totalReceived, totalPending, progress };
  }, [asset, financialHistory]);
}
