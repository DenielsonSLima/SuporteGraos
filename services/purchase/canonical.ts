import { PurchaseOrder } from '../../modules/PurchaseOrder/types';
import { supabase } from '../supabase';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../sqlCanonicalOps';

export interface CanonicalResult {
  success: boolean;
  error?: string;
}

export const upsertPurchaseOrderCanonical = async (order: PurchaseOrder): Promise<CanonicalResult> => {
  if (!isSqlCanonicalOpsEnabled()) return { success: false };

  try {
    const { error } = await supabase.rpc('rpc_ops_purchase_order_upsert_v2', {
      p_payload: order as any
    });

    if (error) {
      sqlCanonicalOpsLog(`Falha RPC compra canônica v2 (${order.id}) — tentando v1`, error);

      const { error: fallbackError } = await supabase.rpc('rpc_ops_purchase_order_upsert_v1', {
        p_payload: order as any
      });

      if (fallbackError) {
        sqlCanonicalOpsLog(`Falha RPC compra canônica v1 (${order.id}) — fallback legado`, fallbackError);
        return { success: false, error: fallbackError.message };
      }
      return { success: true };
    }
    return { success: true };
  } catch (error: any) {
    sqlCanonicalOpsLog(`Erro RPC compra canônica (${order.id}) — fallback legado`, error);
    return { success: false, error: error.message || 'Erro inesperado' };
  }
};

export const deletePurchaseOrderCanonical = async (orderId: string): Promise<CanonicalResult> => {
  if (!isSqlCanonicalOpsEnabled()) return { success: false };

  try {
    const { error } = await supabase.rpc('rpc_ops_purchase_order_delete_v1', {
      p_legacy_id: orderId
    });

    if (error) {
      sqlCanonicalOpsLog(`Falha delete canônico compra (${orderId}) — fallback legado`, error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    sqlCanonicalOpsLog(`Erro delete canônico compra (${orderId}) — fallback legado`, error);
    return { success: false, error: error.message || 'Erro inesperado' };
  }
};
