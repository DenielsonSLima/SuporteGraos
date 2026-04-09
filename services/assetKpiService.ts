import { supabase } from './supabase';
import { AssetKPIData, AssetDetailStats } from '../modules/Assets/hooks/useAssetKPIs';

export const assetKpiService = {
  /**
   * Obtém os indicadores globais de patrimônio da empresa via RPC.
   */
  getSummary: async (companyId: string): Promise<AssetKPIData> => {
    const { data, error } = await supabase.rpc('rpc_asset_summary', {
      p_company_id: companyId
    });

    if (error) {
      console.error('Erro ao buscar rpc_asset_summary:', error);
      throw error;
    }

    return data as AssetKPIData;
  },

  /**
   * Obtém estatísticas detalhadas de progresso de um ativo (venda).
   */
  getDetailStats: async (assetId: string): Promise<AssetDetailStats> => {
    const { data, error } = await supabase.rpc('rpc_asset_detail_stats', {
      p_asset_id: assetId
    });

    if (error) {
      console.error('Erro ao buscar rpc_asset_detail_stats:', error);
      throw error;
    }

    return data as AssetDetailStats;
  }
};
