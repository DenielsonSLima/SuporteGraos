import { supabase } from '../supabase';

export const advancesActions = {
  /**
   * Criar adiantamento via RPC atômica (gera entry + transaction).
   */
  create: async (params: {
    recipientId: string;
    recipientType: 'supplier' | 'client' | 'shareholder';
    amount: number;
    accountId: string;
    description?: string;
    advanceDate?: string;
    parentId?: string;
  }): Promise<string> => {
    const { data, error } = await supabase.rpc('rpc_create_advance', {
      p_recipient_id: params.recipientId,
      p_recipient_type: params.recipientType,
      p_amount: params.amount,
      p_account_id: params.accountId,
      p_description: params.description || null,
      p_advance_date: params.advanceDate || new Date().toISOString().split('T')[0],
      p_parent_id: params.parentId || null,
    });
    if (error) throw new Error(error.message);
    return data as string;
  },
};
