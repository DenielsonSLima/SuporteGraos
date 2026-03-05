/**
 * useAssetSale.ts
 *
 * Hook que encapsula TODA a lógica de registro de venda de ativo.
 *
 * REGRA: "Frontend não faz cálculo crítico" (SKILL §5.4, §7.2)
 *
 * A lógica de parcelamento (divisão de valor, criação de N lançamentos
 * financeiros, cálculo de datas de vencimento) estava duplicada em:
 *   - AssetsModule.tsx (handleConfirmSale)
 *   - AssetDetails.tsx (handleConfirmSale)
 *
 * Agora essa lógica fica centralizada aqui, pronta para ser substituída
 * por uma RPC atômica (`rpc_register_asset_sale`) quando disponível.
 *
 * TODO: Migrar para RPC no banco de dados (atomicidade BEGIN...COMMIT)
 *       A RPC deve receber (asset_id, sale_value, installments, first_due_date)
 *       e executar toda a lógica de forma atômica no PostgreSQL.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../hooks/queryKeys';
import { Asset } from '../types';
import { supabase } from '../../../services/supabase';

export interface AssetSaleInput {
  asset: Asset;
  buyerName: string;
  buyerId?: string;
  saleDate: string;
  saleValue: number;
  installments: number;
  firstDueDate: string;
  notes?: string;
}

/**
 * Hook para registrar venda de ativo com geração de recebível.
 *
 * Utiliza a RPC `rpc_register_asset_sale` para atomicidade no banco de dados.
 */
export function useAssetSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AssetSaleInput) => {
      const {
        asset,
        buyerName,
        buyerId,
        saleDate,
        saleValue,
        installments,
        firstDueDate,
      } = input;

      const { data, error } = await supabase.rpc('rpc_register_asset_sale', {
        p_asset_id: asset.id,
        p_sale_value: saleValue,
        p_installments: installments,
        p_first_due_date: firstDueDate,
        p_buyer_name: buyerName,
        p_buyer_id: buyerId || null,
        p_sale_date: saleDate,
      });

      if (error) {
        throw new Error(`Erro ao registrar venda do ativo: ${error.message}`);
      }

      return { installments, entryId: data };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ASSETS });
      // Invalidar a query de recebíveis para atualizar a tela do financeiro
      // Como não usamos QUERY_KEYS centralizado para receivables aqui, invalidar tudo ligado ao financeiro
      void queryClient.invalidateQueries();
    },
  });
}
