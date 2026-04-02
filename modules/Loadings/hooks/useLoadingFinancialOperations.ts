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
    const expense = {
      id: Math.random().toString(36).substr(2, 9),
      description: expenseData.description,
      value: expenseData.value,
      type: expenseData.type,
      date: expenseData.date
    };

    // 1. Registra no histórico financeiro geral (vincunlado ao frete)
    await financialActionService.processRecord(
      `fr-${loading.id}`,
      {
        amount: expenseData.value,
        discount: expenseData.discountValue || 0,
        date: expenseData.date,
        accountId: expenseData.accountId,
        accountName: expenseData.accountName,
        notes: `${expenseData.description} - ${expenseData.type === 'deduction' ? 'Desconto' : 'Adicional'} Frete ${loading.vehiclePlate}${expenseData.notes ? ' | ' + expenseData.notes : ''}`
      },
      'freight'
    );

    // 2. Invalida caches via TanStack Query (AGUARDADO)
    await invalidateFinancialCaches();

    // 3. Atualiza carregamento local
    onUpdate({
      ...loading,
      extraExpenses: [...(loading.extraExpenses || []), expense]
    });

    addToast('success', 'Despesa registrada com sucesso!');
  };

  // ─── Edita pagamento existente ────────────────────────────────────────
  const updatePayment = async (data: PaymentData, editPayment: any) => {
    const amount = parseFloat(String(data.amount)) || 0;
    const discount = parseFloat(String(data.discount)) || 0;

    const currentLoading = loadingService.getAll().find(l => l.id === loading.id) || loading;
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

    loadingService.update(loadingAtualizado);

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

  // ─── Estorna pagamento (SKIL §3.6: transações imutáveis) ────────────
  // Em vez de excluir, cria transação compensatória preservando auditoria.
  const deletePayment = async (tx: any) => {
    const reversalId = `rev-${tx.id}-${Date.now()}`;
    const now = new Date().toISOString().split('T')[0];

    // 1. Marca a transação original como estornada (preserva registro)
    const updatedTransactions: OrderTransaction[] = (loading.transactions || []).map(t =>
      t.id === tx.id ? { ...t, status: 'reversed' as const } : t
    );

    // 2. Adiciona transação de estorno (valor negativo, referencia a original)
    updatedTransactions.push({
      id: reversalId,
      date: now,
      value: -(tx.value || 0),
      discountValue: 0,
      accountId: tx.accountId || '',
      accountName: tx.accountName || '',
      notes: `[ESTORNO] Ref: ${tx.id} — ${tx.notes || 'Pagamento estornado'}`,
      type: 'reversal',
      originalTxId: tx.id,
    });

    // 3. Recalcula saldo pago (mesmo efeito líquido)
    const updatedPaid = Math.max(0, (loading.freightPaid || 0) - (tx.value || 0));

    const loadingAtualizado = { ...loading, transactions: updatedTransactions, freightPaid: updatedPaid };
    
    // Invalidação via mutation hook + TanStack Query (AGUARDADO)
    await invalidateFinancialCaches();

    onUpdate(loadingAtualizado);
    addToast('success', 'Estorno registrado com sucesso!');
  };

  return {
    processPayment,
    addExpense,
    updatePayment,
    deletePayment,
  };
}
