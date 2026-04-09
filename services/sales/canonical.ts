import { supabase } from '../supabase';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../sqlCanonicalOps';
import { SalesOrder } from '../../modules/SalesOrder/types';

/**
 * SALES CANONICAL
 * Isola as operações RPC para o modo canônico (SQL-first).
 */

export interface CanonicalResult {
  success: boolean;
  error?: string;
  data?: any;
}

export const salesCanonical = {
  upsert: async (sale: SalesOrder): Promise<CanonicalResult> => {
    if (!isSqlCanonicalOpsEnabled()) return { success: false };

    try {
      const { data, error } = await supabase.rpc('rpc_ops_sales_order_upsert_v2', {
        p_payload: sale as any
      });

      if (error) {
        sqlCanonicalOpsLog(`Falha RPC venda canônica v2 (${sale.id}) — tentando v1`, error);

        const { data: fallbackData, error: fallbackError } = await supabase.rpc('rpc_ops_sales_order_upsert_v1', {
          p_payload: sale as any
        });

        if (fallbackError) {
          sqlCanonicalOpsLog(`Falha RPC venda canônica v1 (${sale.id}) — fallback legado`, fallbackError);
          return { success: false, error: fallbackError.message };
        }

        return { success: true, data: fallbackData };
      }

      return { success: true, data };
    } catch (error: any) {
      sqlCanonicalOpsLog(`Erro RPC venda canônica (${sale.id}) — fallback legado`, error);
      return { success: false, error: error.message || 'Erro inesperado no servidor (RPC)' };
    }
  },

  delete: async (saleId: string): Promise<CanonicalResult> => {
    if (!isSqlCanonicalOpsEnabled()) return { success: false };

    try {
      const { error } = await supabase.rpc('rpc_ops_sales_order_delete_v1', {
        p_legacy_id: saleId
      });

      if (error) {
        sqlCanonicalOpsLog(`Falha delete canônico venda (${saleId}) — fallback legado`, error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      sqlCanonicalOpsLog(`Erro delete canônico venda (${saleId}) — fallback legado`, error);
      return { success: false, error: error.message || 'Erro inesperado no servidor (RPC Delete)' };
    }
  }
};

