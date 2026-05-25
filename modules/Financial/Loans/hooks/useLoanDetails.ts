// modules/Financial/Loans/hooks/useLoanDetails.ts
// ============================================================================
// Hook que encapsula toda lógica de serviço do LoanDetails
// SKIL: TSX NÃO deve importar services diretamente
// ============================================================================

import { useState, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '../../../../services/supabase';
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
  // ─── Extrato financeiro (Legado + Canônico) ─────────────────
  const [canonicalTransactions, setCanonicalTransactions] = useState<any[]>([]);
  const [legacyTransactions, setLegacyTransactions] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Busca transações (Canônicas + Legado)
  const fetchHistory = useCallback(async () => {
    // Só ativa o loading principal se for a primeira carga para evitar "piscar" a cada refresh
    if (canonicalTransactions.length === 0 && legacyTransactions.length === 0) {
      setIsLoadingHistory(true);
    }
    try {
      // 1. BUSCA CANÔNICA (financial_transactions)
      // Primeiro buscamos os IDs das entries vinculadas ao empréstimo
      const { data: entries } = await supabase
        .from('financial_entries')
        .select('id')
        .eq('origin_id', loan.id)
        .eq('origin_type', 'loan');

      let entryIds: string[] = [];
      if (entries && entries.length > 0) {
        entryIds = entries.map(e => e.id);
      }

      // Busca transações pela descrição (legado/fallback)
      const { data: keywordData } = await supabase
        .from('financial_transactions')
        .select(`id, transaction_date, description, amount, account_id, type, metadata`)
        .ilike('description', `%${loan.id}%`);

      // Busca transações via metadata loan_id
      const { data: metadataData } = await supabase
        .from('financial_transactions')
        .select(`id, transaction_date, description, amount, account_id, type, metadata`)
        .eq('metadata->>loan_id', loan.id);

      // Busca transações das entries (canônico)
      let entryData: any[] = [];
      if (entryIds.length > 0) {
        const { data } = await supabase
          .from('financial_transactions')
          .select(`id, transaction_date, description, amount, account_id, type, metadata`)
          .in('entry_id', entryIds);
        entryData = data || [];
      }

      // Unificar sem duplicados (por ID)
      const allData = [...entryData, ...(keywordData || []), ...(metadataData || [])];
      const uniqueData = Array.from(new Map(allData.map(item => [item.id, item])).values());

      setCanonicalTransactions(uniqueData.map(t => ({
        id: t.id,
        issueDate: t.transaction_date,
        description: t.description,
        paidValue: Number(t.amount),
        bankAccount: t.account_id,
        subType: t.type === 'credit' ? 'receipt' : 'admin',
        isDisbursement: !!t.metadata?.is_disbursement,
        isReversal: !!t.metadata?.is_reversal,
        reversesId: t.metadata?.reverses_id || null,
        metadata: t.metadata
      })));

      // 2. BUSCA LEGADO (admin_expenses)
      const legacyRecords = await financialActionService.getStandaloneRecords();
      const filteredLegacy = legacyRecords.filter((r: any) => {
        const hasLoanRef = r.id?.startsWith(loan.id) || r.notes?.includes(`[ORIGIN:${loan.id}]`);
        return hasLoanRef &&
          ['receipt', 'admin', 'loan_taken', 'loan_granted'].includes(r.subType || '') &&
          ((r.paidValue || 0) > 0 || (r.originalValue || 0) > 0);
      });
      setLegacyTransactions(filteredLegacy);

    } catch (err) {
      console.error('[useLoanDetails] Failed to fetch history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [loan.id]);

  // Efeito para carregar dados
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, txVersion]);

  const financialHistory = useMemo(() => {
    const list = [...legacyTransactions, ...canonicalTransactions];
    
    // Identifica transações que foram estornadas (revertidas)
    const reversedIds = new Set(
      list.map(t => t.reversesId).filter(Boolean)
    );

    return list
      .map(t => ({
        ...t,
        isReversed: reversedIds.has(t.id)
      }))
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [legacyTransactions, canonicalTransactions]);

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
        const isUuid = tx.id.length > 20; // Check if it's a real UUID (canonical) or our legacy prefixed ID

        if (isUuid) {
          // UPDATE na tabela canônica
          const { error: updateError } = await supabase
            .from('financial_transactions')
            .update({
              description: tx.description,
              amount: tx.value,
              transaction_date: tx.date,
              account_id: tx.accountId
            })
            .eq('id', tx.id);

          if (updateError) throw updateError;
        } else {
          // UPDATE na tabela legado/auxiliar
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
        }
      } else if (tx.accountId) {
        const subType = resolveSubTypeFromTx(tx.type);
        const txId = crypto.randomUUID();

        // 🟢 ATUALIZADO: Usamos apenas addTransaction para evitar duplicidade no histórico
        // O LoansService agora cuida do Caixa e dos Totais do Contrato de forma atômica.
        await loansService.addTransaction(loan.id, {
          type: tx.type,
          value: tx.value,
          description: tx.description || (tx.type === 'increase' ? 'Reforço de Empréstimo' : 'Pagamento de Empréstimo'),
          accountId: tx.accountId,
          date: tx.date
        });
      } else if (tx.isHistorical && !tx.accountId) {
        const subType = resolveSubTypeFromTx(tx.type);
        const txId = crypto.randomUUID();

        await financialActionService.addAdminExpense({
          id: txId,
          description: tx.description || 'Abatimento / Desconto',
          entityName: loan.entityName,
          category: 'Empréstimos',
          categoryId: '00000000-0000-0000-0000-000000000003',
          dueDate: tx.date,
          issueDate: tx.date,
          originalValue: tx.value,
          paidValue: tx.value,
          discountValue: 0,
          status: 'paid',
          subType: subType as any,
          bankAccount: undefined,
          notes: `[ORIGIN:${loan.id}]`
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
      // Reverte saldo do empréstimo e deleta a transação financeira
      await loansService.removeTransaction(loan.id, deletingTxRecord.id);
      setDeletingTxRecord(null);
      setTxVersion(v => v + 1);
      onUpdate();
      addToast('success', 'Movimentação excluída');
    } catch (error) {
      addToast('error', 'Erro ao excluir movimentação', (error as any).message);
    }
  }, [deletingTxRecord, loan.id, onUpdate, addToast]);

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
