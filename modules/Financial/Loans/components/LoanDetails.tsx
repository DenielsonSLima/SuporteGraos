
import React, { useState } from 'react';
import { LoanRecord, LoanTransaction } from '../../types';
import LoanTransactionModal from './LoanTransactionModal';
import LoanFormModal from './LoanFormModal';
import LoanPdfModal from './LoanPdfModal';
import ConfirmModal from '../../../../components/ui/ConfirmModal';
import { useToast } from '../../../../contexts/ToastContext';
import { useAccounts } from '../../../../hooks/useAccounts';
import { useLoanDetails } from '../hooks/useLoanDetails';
import { loansService } from '../../../../services/loansService';
import { supabase } from '../../../../services/supabase';

// Sub-componentes modularizados
import LoanDetailsHeader from './Details/LoanDetailsHeader';
import LoanDetailsCard from './Details/LoanDetailsCard';
import LoanHistoryTable from './Details/LoanHistoryTable';

interface Props {
  loan: LoanRecord;
  onBack: () => void;
  onUpdate: () => void;
}

const LoanDetails: React.FC<Props> = ({ loan, onBack, onUpdate }) => {
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteTxModalOpen, setIsDeleteTxModalOpen] = useState(false);
  const { data: accountsList = [] } = useAccounts();
  const { addToast } = useToast();

  const {
    editingTx, setEditingTx,
    deletingTxRecord, setDeletingTxRecord,
    financialHistory,
    handleAddTx, handleEditTx, handleDeleteTx,
    confirmDeleteTx, handleDeleteContract,
  } = useLoanDetails({ loan, onUpdate, onBack, addToast });

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  const dateStr = (val: string) => {
    if (!val) return '-';
    // Split para evitar problemas de fuso horário (UTC vs Local)
    const [year, month, day] = val.split(/[-T/]/).map(Number);
    if (!year || !month || !day) return val;
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
  };

  const getBankAccountName = (bankAccountId?: string, description?: string) => {
    if (!bankAccountId) {
      if (description && /abatimento|desconto|ajuste/i.test(description)) return 'Desconto';
      return 'Não informada';
    }
    const account = accountsList.find(a => a.id === bankAccountId);
    return account?.account_name || bankAccountId;
  };

  const onSaveTx = async (tx: Omit<LoanTransaction, 'id'> & { id?: string }) => {
    await handleAddTx(tx);
    setIsTxModalOpen(false);
  };

  const onEditTx = (record: any) => {
    handleEditTx(record);
    setIsTxModalOpen(true);
  };

  const onDeleteTx = (record: any) => {
    handleDeleteTx(record);
    setIsDeleteTxModalOpen(true);
  };

  const onConfirmDeleteTx = async () => {
    await confirmDeleteTx();
    setIsDeleteTxModalOpen(false);
  };

  const onSaveLoanEdit = async (updatedLoan: any) => {
    try {
      await loansService.update(loan.id, {
        principal_amount: updatedLoan.contractValue,
        start_date: updatedLoan.date,
      });
      
      const { data: entries } = await supabase
        .from('financial_entries')
        .select('id')
        .eq('origin_id', loan.id)
        .eq('origin_type', 'loan');
      
      if (entries && entries.length > 0) {
        await supabase
          .from('financial_entries')
          .update({ 
            description: `${loan.type === 'taken' ? 'Empréstimo Tomado' : 'Empréstimo Cedido'}: ${updatedLoan.description}`,
            total_amount: updatedLoan.contractValue,
            created_date: updatedLoan.date
          })
          .eq('id', entries[0].id);
      }

      addToast('success', 'Contrato atualizado');
      onUpdate();
      setIsEditModalOpen(false);
    } catch (err: any) {
      addToast('error', 'Erro ao atualizar contrato', err.message);
    }
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      
      <LoanDetailsHeader 
        loan={loan}
        onBack={onBack}
        onEdit={() => setIsEditModalOpen(true)}
        onPrint={() => setIsPdfModalOpen(true)}
        onDelete={() => setIsDeleteModalOpen(true)}
        onNewTransaction={() => {
          setEditingTx(null);
          setIsTxModalOpen(true);
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <LoanDetailsCard 
          loan={loan}
          currency={currency}
          dateStr={dateStr}
          getBankAccountName={getBankAccountName}
        />

        <LoanHistoryTable 
          history={financialHistory}
          currency={currency}
          dateStr={dateStr}
          getBankAccountName={getBankAccountName}
          onEdit={onEditTx}
          onDelete={onDeleteTx}
        />
      </div>

      <LoanFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={onSaveLoanEdit}
        initialLoan={loan}
      />
      
      <LoanTransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={onSaveTx}
        loanType={loan.type}
        initialTx={editingTx || undefined}
      />
      
      <LoanPdfModal 
        isOpen={isPdfModalOpen} 
        onClose={() => setIsPdfModalOpen(false)} 
        loan={loan} 
        history={financialHistory as any[]} 
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteContract}
        title="Excluir Contrato?"
        message={`Tem certeza que deseja apagar o contrato com ${loan.entityName}?`}
        detail="Todos os lançamentos internos serão perdidos e a transação financeira original será estornada."
        confirmLabel="Sim, Excluir"
        cancelLabel="Não, Manter"
        variant="danger"
      />

      <ConfirmModal
        isOpen={isDeleteTxModalOpen}
        onClose={() => {
          setIsDeleteTxModalOpen(false);
          setDeletingTxRecord(null);
        }}
        onConfirm={onConfirmDeleteTx}
        title="Excluir Movimentação?"
        message="Tem certeza que deseja apagar esta movimentação?"
        detail={deletingTxRecord?.description}
        confirmLabel="Sim, Excluir"
        cancelLabel="Não, Manter"
        variant="danger"
      />
    </div>
  );
};

export default LoanDetails;
