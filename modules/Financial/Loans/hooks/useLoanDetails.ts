// modules/Financial/Loans/hooks/useLoanDetails.ts
// ============================================================================
// Hook que encapsula toda lógica de serviço do LoanDetails
// SKIL: TSX NÃO deve importar services diretamente
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import { loansService } from '../../../../services/loansService';
import { financialActionService } from '../../../../services/financialActionService';
import { standaloneRecordsService } from '../../../../services/standaloneRecordsService';
import type { LoanRecord, LoanTransaction } from '../../types';

interface UseLoanDetailsOptions {
  loan: LoanRecord;
  onUpdate: () => void;
  onBack: () => void;
  addToast: (type: string, title: string, message?: string) => void;
}

export function useLoanDetails({ loan, onUpdate, onBack, addToast }: UseLoanDetailsOptions) {
  const [txVersion, setTxVersion] = useState(0);
  const [editingTx, setEditingTx] = useState<(Omit<LoanTransaction, 'id'> & { id?: string }) | null>(null);
  const [deletingTxRecord, setDeletingTxRecord] = useState<any | null>(null);

  // ─── Extrato financeiro ─────────────────────────────────
  const financialHistory = useMemo(() => {
    return (financialActionService.getStandaloneRecords() as any[])
      .filter((r: any) => {
        return r.id?.startsWith(loan.id) && ['receipt', 'admin'].includes(r.subType || '') && r.paidValue > 0;
      })
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loan.id, txVersion]);

  // ─── Helpers de tipo ────────────────────────────────────
  const getTxTypeFromRecord = useCallback((subType?: string): 'increase' | 'decrease' => {
    if (loan.type === 'taken') return subType === 'receipt' ? 'increase' : 'decrease';
    return subType === 'receipt' ? 'decrease' : 'increase';
  }, [loan.type]);

  const resolveSubTypeFromTx = useCallback((type: 'increase' | 'decrease') => {
    const isEntry = (loan.type === 'taken' && type === 'increase') || (loan.type === 'granted' && type === 'decrease');
    return isEntry ? 'receipt' : 'admin';
  }, [loan.type]);

  // ─── Adicionar / Editar lançamento ──────────────────────
  const handleAddTx = useCallback(async (tx: Omit<LoanTransaction, 'id'> & { id?: string }) => {
    try {
      // SALVAR ou ATUALIZAR registro auxiliar (movimentação)
      if (tx.id) {
        const subType = resolveSubTypeFromTx(tx.type);
        await standaloneRecordsService.update({
          id: tx.id,
          description: tx.description || (tx.type === 'increase' ? 'Reforço de Empréstimo' : 'Pagamento de Empréstimo'),
          entityName: loan.entityName,
          category: 'Empréstimos',
          dueDate: tx.date,
          issueDate: tx.date,
          originalValue: tx.value,
          paidValue: tx.value,
          discountValue: 0,
          status: 'paid',
          subType: subType as any,
          bankAccount: tx.accountId
        });
      } else if (tx.accountId) {
        const subType = resolveSubTypeFromTx(tx.type);
        const txId = crypto.randomUUID().slice(0, 9);

        await financialActionService.addAdminExpense({
          id: `${loan.id}-tx-${txId}`,
          description: tx.description || (tx.type === 'increase' ? 'Reforço de Empréstimo' : 'Pagamento de Empréstimo'),
          entityName: loan.entityName,
          category: 'Empréstimos',
          dueDate: tx.date,
          issueDate: tx.date,
          originalValue: tx.value,
          paidValue: tx.value,
          discountValue: 0,
          status: 'paid',
          subType: subType as any,
          bankAccount: tx.accountId
        });
      } else if (tx.isHistorical && !tx.accountId) {
        const subType = resolveSubTypeFromTx(tx.type);
        const txId = crypto.randomUUID().slice(0, 9);

        await financialActionService.addAdminExpense({
          id: `${loan.id}-tx-${txId}`,
          description: tx.description || 'Abatimento / Desconto',
          entityName: loan.entityName,
          category: 'Empréstimos',
          dueDate: tx.date,
          issueDate: tx.date,
          originalValue: tx.value,
          paidValue: tx.value,
          discountValue: 0,
          status: 'paid',
          subType: subType as any,
          bankAccount: undefined
        });
      }

      setEditingTx(null);
      setTxVersion(v => v + 1);
      onUpdate();

      if (tx.id) {
        addToast('success', 'Lançamento atualizado');
      } else if (!tx.accountId) {
        addToast('success', 'Desconto registrado');
      } else {
        addToast('success', tx.type === 'increase' ? 'Reforço lançado' : 'Pagamento lançado');
      }
    } catch (error) {
      addToast('error', 'Erro ao salvar lançamento', (error as any).message);
    }
  }, [loan.entityName, resolveSubTypeFromTx, onUpdate, addToast]);

  // ─── Editar lançamento (abre modal) ────────────────────
  const handleEditTx = useCallback((record: any) => {
    const type = getTxTypeFromRecord(record.subType);
    setEditingTx({
      id: record.id,
      date: record.issueDate,
      type,
      value: record.paidValue || 0,
      description: record.description,
      accountId: record.bankAccount,
      accountName: '',
      isHistorical: false
    });
  }, [getTxTypeFromRecord]);

  // ─── Marcar para exclusão ──────────────────────────────
  const handleDeleteTx = useCallback((record: any) => {
    setDeletingTxRecord(record);
  }, []);

  // ─── Confirmar exclusão de movimentação ─────────────────
  const confirmDeleteTx = useCallback(async () => {
    if (!deletingTxRecord) return;
    try {
      await financialActionService.deleteStandaloneRecord(deletingTxRecord.id);
      setDeletingTxRecord(null);
      setTxVersion(v => v + 1);
      onUpdate();
      addToast('success', 'Movimentação excluída');
    } catch (error) {
      addToast('error', 'Erro ao excluir movimentação', (error as any).message);
    }
  }, [deletingTxRecord, onUpdate, addToast]);

  // ─── Excluir contrato ──────────────────────────────────
  const handleDeleteContract = useCallback(() => {
    void loansService.delete(loan.id)
      .then(() => {
        addToast('success', 'Empréstimo excluído');
        onBack();
      })
      .catch((error: any) => {
        addToast('error', 'Erro ao excluir empréstimo', error?.message || 'Falha ao excluir');
      });
  }, [loan.id, addToast, onBack]);

  return {
    // State
    editingTx,
    setEditingTx,
    deletingTxRecord,
    setDeletingTxRecord,
    // Data
    financialHistory,
    // Actions
    handleAddTx,
    handleEditTx,
    handleDeleteTx,
    confirmDeleteTx,
    handleDeleteContract,
  };
}
