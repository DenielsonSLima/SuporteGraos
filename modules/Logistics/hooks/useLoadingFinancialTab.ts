/**
 * useLoadingFinancialTab.ts
 *
 * Wrapper fino sobre useLoadingFinancialOperations (Loadings/hooks).
 * Adiciona gerenciamento de estado de UI (modais, isProcessing) que o
 * componente LoadingFinancialTab do Logistics precisa.
 *
 * ⚠️ A lógica de negócio (processPayment, addExpense, updatePayment, deletePayment)
 *    é 100% delegada ao hook canônico — DRY compliance.
 */

import { useMemo, useState } from 'react';
import { Loading } from '../../Loadings/types';
import { useLoadingFinancialOperations } from '../../Loadings/hooks/useLoadingFinancialOperations';
import { computeFreightSummary } from '../../Loadings/calculations';
import { useFreightBalance } from '../../../hooks/useFreightBalance';

interface UseLoadingFinancialTabParams {
  loading: Loading;
  onUpdate: (updated: Loading) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}

export function useLoadingFinancialTab({ loading, onUpdate, addToast }: UseLoadingFinancialTabParams) {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editPayment, setEditPayment] = useState<any>(null);

  // ─── Delega operações ao hook canônico (Loadings) ─────────────────────
  const ops = useLoadingFinancialOperations({ loading, onUpdate });

  // ✅ SKIL §5.4: balance canônico vem de financial_entries (DB), não de cálculo frontend
  const { data: dbBalance } = useFreightBalance(loading.id);

  // ─── Totais via função pura + override do banco ───────────────────────
  const totals = useMemo(() => {
    const summary = computeFreightSummary(loading);
    return {
      totalAdditions: summary.totalAdditions,
      totalDeductions: summary.totalDeductions,
      totalPaid: dbBalance?.paidAmount ?? summary.totalPaid,
      totalDisc: dbBalance?.discountAmount ?? summary.totalDiscount,
      netFreightTotal: summary.netFreightTotal,
      balance: dbBalance?.balance ?? summary.balance,
    };
  }, [loading, dbBalance]);

  // ─── Handlers com gerenciamento de estado de UI ───────────────────────
  const handleConfirmPayment = async (data: any) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await ops.processPayment(data);
      setIsPayModalOpen(false);
      addToast('success', 'Pagamento registrado com sucesso!');
    } catch {
      addToast('error', 'Erro ao processar pagamento');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddExpense = (expenseData: any) => {
    ops.addExpense(expenseData);
    setIsExpenseModalOpen(false);
    addToast('success', 'Despesa registrada com sucesso!');
  };

  const handleEditPayment = (tx: any) => {
    setEditPayment(tx);
    setIsPayModalOpen(true);
  };

  const handleUpdatePayment = async (data: any) => {
    if (!editPayment || isProcessing) return;
    setIsProcessing(true);
    try {
      await ops.updatePayment(data, editPayment);
      setIsPayModalOpen(false);
      setEditPayment(null);
      addToast('success', 'Pagamento editado com sucesso!');
    } catch {
      addToast('error', 'Erro ao editar pagamento');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePayment = (tx: any) => {
    ops.deletePayment(tx);
  };

  return {
    totals,
    isExpenseModalOpen,
    setIsExpenseModalOpen,
    isPayModalOpen,
    setIsPayModalOpen,
    isProcessing,
    editPayment,
    setEditPayment,
    handleConfirmPayment,
    handleAddExpense,
    handleEditPayment,
    handleUpdatePayment,
    handleDeletePayment,
  };
}
