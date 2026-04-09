/**
 * useLoadingFinancialOperations.ts
 *
 * Hook co-localizado para LoadingFinancialTab.
 * Encapsula TODOS os service imports:
 * - financialActionService (processRecord, syncDeleteFromOrigin)
 * - loadingService (getAll, update)
 * - standaloneRecordsService (getById, update)
 * - financialHistoryService (getById, update)
 *
 * SKIL: TSX não importa services diretamente.
 * Invalidação via TanStack Query (sem window.dispatchEvent).
 */

import { financialActionService } from '../../../services/financialActionService';
import { loadingService } from '../../../services/loadingService';
import { standaloneRecordsService } from '../../../services/standaloneRecordsService';
import { financialHistoryService } from '../../../services/financial/financialHistoryService';
import { supabase } from '../../../services/supabase';
import { useUpdateLoading } from '../../../hooks/useLoadingMutations';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../hooks/queryKeys';
import { useToast } from '../../../contexts/ToastContext';
import type { Loading } from '../types';
import type { PaymentData } from '../../Financial/components/modals/FinancialPaymentModal';
import type { OrderTransaction } from '../../PurchaseOrder/types';

interface UseLoadingFinancialOperationsProps {
  loading: Loading;
  onUpdate: (updated: Loading) => void;
}

export function useLoadingFinancialOperations({ loading, onUpdate }: UseLoadingFinancialOperationsProps) {
  const { addToast } = useToast();
  const updateLoadingMut = useUpdateLoading();
  const queryClient = useQueryClient();

  /** Invalida todos os caches financeiros relevantes */
  const invalidateFinancialCaches = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOADINGS }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FREIGHTS }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TRANSACTIONS }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS })
    ]);
  };

  // ─── Processa pagamento de frete ──────────────────────────────────────
  const processPayment = async (data: PaymentData) => {
    await financialActionService.processRecord(`fr-${loading.id}`, data, 'freight');

    // Invalidação via mutation hook + TanStack Query AGORA AGUARDADA
    await invalidateFinancialCaches();

    // Notificamos o componente pai do sucesso, permitindo que os hooks reativos (dbBalance/dbTransactions)
    // façam o trabalho pesado de exibir os dados novos que acabaram de ser persistidos.
    onUpdate({
      ...loading,
      freightPaid: (loading.freightPaid || 0) + data.amount
    });
  };

  // ─── Adiciona despesa do motorista ────────────────────────────────────
  const addExpense = async (expenseData: any) => {
    const description = `${expenseData.description} - Frete ${loading.vehiclePlate}`;
    
    // 1. Execução Atômica via RPC (SQL-First)
    // Este RPC atualiza o carregamento, a financial_entry e opcionalmente gera o ledger se houver conta.
    const { data: result, error } = await supabase.rpc('rpc_ops_loading_manage_expense', {
      p_loading_id: loading.id,
      p_description: description,
      p_amount: expenseData.value,
      p_type: expenseData.type, // 'addition' | 'deduction'
      p_date: expenseData.date,
      p_account_id: expenseData.accountId || null
    });

    if (error) {
      throw new Error(`Erro ao registrar despesa no banco: ${error.message}`);
    }

    // 2. Injeta histórico leve para compatibilidade de UI
    await registerFinancialRecords({
      txId: `exp-${loading.id.slice(0, 5)}`,
      date: expenseData.date,
      amount: expenseData.value,
      discount: 0,
      accountId: expenseData.accountId,
      accountName: expenseData.accountName,
      type: expenseData.type === 'addition' ? 'receipt' : 'payment',
      recordId: loading.id,
      referenceType: 'loading',
      referenceId: loading.id,
      description,
      historyType: 'Ajuste de Frete',
      entityName: loading.driverName || 'Motorista',
      notes: expenseData.notes
    });

    // 3. Invalida caches via TanStack Query
    await invalidateFinancialCaches();

    addToast('success', 'Despesa registrada com sucesso!');
  };

  // ─── Edita pagamento existente ────────────────────────────────────────
  const updatePayment = async (data: PaymentData, editPayment: any) => {
    const amount = parseFloat(String(data.amount)) || 0;
    const discount = parseFloat(String(data.discount)) || 0;

    const currentLoading = loading;
    const updatedTransactions = (currentLoading.transactions || []).map((t: any) =>
      t.id === editPayment.id
        ? {
          ...t,
          date: data.date,
          value: amount,
          discountValue: discount,
          accountId: data.accountId,
          accountName: data.accountName,
          notes: data.notes,
          type: t.type || 'payment'
        }
        : t
    );

    // ✅ SKIL §5.4: freightPaid vem do financial_entries (autoridade do banco),
    // não de .reduce() no frontend. Fallback local apenas se financial_entry não existe.
    let freightPaidFromDb: number | null = null;
    try {
      const { data: feData } = await supabase
        .from('financial_entries')
        .select('paid_amount, discount_amount')
        .eq('origin_id', loading.id)
        .eq('origin_type', 'freight')
        .maybeSingle();
      if (feData) {
        freightPaidFromDb = Number(feData.paid_amount ?? 0);
      }
    } catch { /* fallback abaixo */ }

    const totalPaidUpdated = freightPaidFromDb ?? updatedTransactions.reduce((acc: number, t: any) => acc + (t.value || 0), 0);
    const loadingAtualizado = {
      ...currentLoading,
      transactions: updatedTransactions,
      freightPaid: Number(totalPaidUpdated.toFixed(2))
    };

    await loadingService.update(loadingAtualizado);

    const standaloneId = `hist-${editPayment.id}`;
    const standalone = standaloneRecordsService.getById(standaloneId);
    if (standalone) {
      const originTag = (standalone.notes || '').match(/\[ORIGIN:[^\]]+\]/)?.[0] || `[ORIGIN:fr-${loading.id}]`;
      await standaloneRecordsService.update({
        ...standalone,
        dueDate: data.date,
        issueDate: data.date,
        settlementDate: data.date,
        originalValue: amount + discount,
        paidValue: amount,
        discountValue: discount,
        bankAccount: data.accountId || data.accountName || standalone.bankAccount,
        notes: `${data.notes || ''} ${originTag}`.trim()
      });
    }

    const historyId = `fh-${editPayment.id}`;
    const history = financialHistoryService.getById(historyId);
    if (history) {
      const balanceAfter = history.operation === 'inflow'
        ? history.balanceBefore + amount
        : history.balanceBefore - amount;
      financialHistoryService.update({
        ...history,
        date: data.date,
        amount,
        balanceAfter,
        bankAccountId: data.accountId || history.bankAccountId,
        notes: data.notes
      });
    }

    // Invalidação via mutation hook + TanStack Query (AGUARDADO)
    await invalidateFinancialCaches();

    onUpdate(loadingAtualizado);
  };

  // ─── Estorna pagamento (SQL-First: Estorno Real) ────────────────────
  const deletePayment = async (tx: any) => {
    // 1. Execução Atômica via RPC de Estorno
    // Isso deleta a transação e restaura os saldos automaticamente no banco.
    const { error } = await supabase.rpc('rpc_ops_financial_void_transaction', {
      p_transaction_id: tx.id
    });

    if (error) {
      throw new Error(`Erro ao realizar estorno no banco: ${error.message}`);
    }
    
    // 2. Invalida caches via TanStack Query
    await invalidateFinancialCaches();

    addToast('success', 'Estorno realizado com sucesso!');
  };

  return {
    processPayment,
    addExpense,
    updatePayment,
    deletePayment,
  };
}
