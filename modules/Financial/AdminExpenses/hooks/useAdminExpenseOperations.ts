/**
 * useAdminExpenseOperations.ts
 *
 * Hook co-localizado para AdminExpensesTab.
 * Encapsula o service import:
 * - adminExpensesService (create)
 * - supabase RPC (pay_financial_entry, apply_discount_financial_entry)
 *
 * SKIL: TSX não importa services diretamente.
 */

import { supabase } from '../../../../services/supabase';
import { adminExpensesService } from '../../../../services/adminExpensesService';
import { financialTransactionsService } from '../../../../services/financialTransactionsService';
import { useToast } from '../../../../contexts/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../../hooks/queryKeys';

interface CreateExpenseParams {
  categoryId?: string;
  description: string;
  amount: number;
  payeeName?: string;
  accountId?: string;
  expenseDate: string;
  dueDate: string;
}

interface PayExpenseParams {
  entryOriginId: string; // id do admin_expense que serve como origin_id na financial_entries
  accountId: string;
  amount: number;
  discount?: number;
  description?: string;
}

export function useAdminExpenseOperations() {
  const queryClient = useQueryClient();

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_EXPENSES });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_ENTRIES });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS });
  };

  const createExpense = async (params: CreateExpenseParams): Promise<string> => {
    const id = await adminExpensesService.create(params);
    return id;
  };

  /**
   * Baixa de pagamento de despesa administrativa via RPC atômica.
   * Fluxo: localiza financial_entry pelo origin_id → pay_financial_entry RPC.
   */
  const payExpense = async (params: PayExpenseParams) => {
    // 1. Localizar a financial_entry vinculada ao admin_expense
    const { data: entries, error: lookupErr } = await supabase
      .from('financial_entries')
      .select('id')
      .eq('origin_id', params.entryOriginId)
      .limit(1);

    if (lookupErr) throw new Error(`Erro ao localizar entrada financeira: ${lookupErr.message}`);

    const entry = entries?.[0];
    if (!entry) throw new Error('Entrada financeira não encontrada para esta despesa. Verifique se a despesa foi criada corretamente.');

    // 2. Aplicar desconto se houver
    if (params.discount && params.discount > 0) {
      const { error: discountErr } = await supabase.rpc('apply_discount_financial_entry', {
        p_entry_id: entry.id,
        p_amount: params.discount,
      });
      if (discountErr) throw new Error(`Erro ao aplicar desconto: ${discountErr.message}`);
    }

    // 3. Registrar pagamento via RPC (se entry existe) ou Direto (se não existe)
    if (params.amount > 0) {
      if (entry) {
        const { error: payErr } = await supabase.rpc('pay_financial_entry', {
          p_entry_id: entry.id,
          p_account_id: params.accountId,
          p_amount: params.amount,
          p_description: params.description || 'Pagamento de despesa administrativa',
        });
        if (payErr) throw new Error(`Erro ao registrar pagamento: ${payErr.message}`);
      } else {
        // Fallback: Pagamento direto via Transaction Service
        await financialTransactionsService.add({
          account_id: params.accountId,
          type: 'debit',
          amount: params.amount,
          transaction_date: new Date().toISOString().split('T')[0],
          description: params.description || 'Pagamento direto de despesa administrativa',
          entry_id: undefined
        });
      }
    }

    // 4. Atualizar status no admin_expenses também
    await supabase
      .from('admin_expenses')
      .update({
        status: 'paid',
        paid_date: new Date().toISOString().split('T')[0],
        account_id: params.accountId,
      })
      .eq('id', params.entryOriginId);
  };

  const deleteExpense = async (id: string) => {
    await adminExpensesService.delete(id);
  };

  const updateExpense = async (id: string, params: Partial<CreateExpenseParams>) => {
    await adminExpensesService.update(id, {
      description: params.description,
      amount: params.amount,
      expenseDate: params.expenseDate,
      due_date: params.dueDate,
      payeeName: params.payeeName,
      categoryId: params.categoryId
    });
  };

  /**
   * Reverte (exclui) um pagamento de despesa administrativa.
   * A RPC deleta a transação e os triggers cuidam de:
   *   - Devolver saldo na conta bancária
   *   - Recalcular paid_amount na financial_entry
   *   - Atualizar status do admin_expense
   */
  const reversePayment = async (transactionId: string) => {
    const { error } = await supabase.rpc('rpc_reverse_admin_expense_payment', {
      p_transaction_id: transactionId,
    });
    if (error) throw new Error(`Erro ao reverter pagamento: ${error.message}`);
  };

  return {
    createExpense,
    payExpense,
    deleteExpense,
    updateExpense,
    reversePayment,
    refreshData,
  };
}
