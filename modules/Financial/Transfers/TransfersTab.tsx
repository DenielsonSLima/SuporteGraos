
import React, { useState, useMemo } from 'react';
import { ArrowRightLeft, ArrowRight, Calendar, Plus, Wallet, Trash2, Pencil } from 'lucide-react';
import type { Transfer } from '../../../services/transfersService';
import { useTransfers, useCreateTransfer, useUpdateTransfer, useDeleteTransfer, useTransfersMonthTotal } from '../../../hooks/useTransfers';
import { useAccounts } from '../../../hooks/useAccounts';
import FinancialRecordForm from '../components/modals/FinancialRecordForm';
import ActionConfirmationModal from '../../../components/ui/ActionConfirmationModal';
import { useToast } from '../../../contexts/ToastContext';
import { useTransferOperations } from './hooks/useTransferOperations';

const TransfersTab: React.FC = () => {
  const { addToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'month' | 'history'>('month');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [transferToDelete, setTransferToDelete] = useState<Transfer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // TanStack Query: dados + realtime automático
  const { data: transfers = [], isLoading: loading } = useTransfers();
  const { data: accounts = [] } = useAccounts();
  const { data: monthTotalData } = useTransfersMonthTotal();
  const createTransfer = useCreateTransfer();
  const updateTransfer = useUpdateTransfer();
  const deleteTransferMutation = useDeleteTransfer();

  // Hook co-localizado — encapsula accountsService + invalidações (SKIL compliance)
  const { refreshFinancialViews } = useTransferOperations();

  const handleAddTransfer = async (formData: any) => {
    try {
      const amount = formData.amount ?? formData.value;
      const fromAccountId = formData.fromAccountId;

      await createTransfer.mutateAsync({
        accountFromId: fromAccountId,
        accountToId: formData.toAccountId,
        amount,
        description: formData.description,
        transferDate: formData.transferDate ?? formData.date,
      });
      refreshFinancialViews();
      addToast('success', 'Transferência Realizada');
    } catch (err: any) {
      addToast('error', 'Erro na Transferência', err.message);
      throw err;
    }
  };

  const handleUpdateTransfer = async (formData: any) => {
    try {
      if (!editingTransfer) return;
      const amount = formData.amount ?? formData.value;
      const fromAccountId = formData.fromAccountId;

      await updateTransfer.mutateAsync({
        id: editingTransfer.id,
        accountFromId: fromAccountId,
        accountToId: formData.toAccountId,
        amount,
        description: formData.description,
        transferDate: formData.transferDate ?? formData.date,
      });

      refreshFinancialViews();

      setEditingTransfer(null);
      setIsAddModalOpen(false);
      addToast('success', 'Transferência Atualizada');
    } catch (err: any) {
      addToast('error', 'Erro ao Atualizar Transferência', err.message);
      throw err;
    }
  };

  const handleDeleteTransfer = async () => {
    try {
      if (!transferToDelete) return;
      setIsDeleting(true);

      await deleteTransferMutation.mutateAsync(transferToDelete.id);

      refreshFinancialViews();
      addToast('success', 'Transferência Excluída');
      setTransferToDelete(null);
    } catch (err: any) {
      addToast('error', 'Erro ao Excluir Transferência', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');
  const getAccountLabel = (accountId: string) => {
    const acc = accounts.find(a => a.id === accountId);
    return acc ? acc.account_name : accountId;
  };

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const currentMonthTransfers = useMemo(
    () => transfers.filter(t => t.transfer_date?.startsWith(currentMonthStr)),
    [transfers, currentMonthStr]
  );
  
  // ✅ ZERO CÁLCULO NO FRONTEND — total via RPC server-side
  const totalMonthTransfers = monthTotalData?.total ?? 0;
  const displayedTransfers = activeSubTab === 'month' ? currentMonthTransfers : transfers;

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveSubTab('month')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeSubTab === 'month' ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Resumo do Mês
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeSubTab === 'history' ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Histórico Geral
          </button>
        </div>

        <button 
          onClick={() => {
            setEditingTransfer(null);
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
        >
          <Plus size={18} />
          Nova Transferência
        </button>
      </div>

      {activeSubTab === 'month' && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl flex justify-between items-center overflow-hidden relative">
          <div className="absolute right-0 top-0 opacity-10 p-4 rotate-12"><ArrowRightLeft size={100}/></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2 opacity-80">
              <ArrowRightLeft size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Fluxo Interno (Mês Atual)</span>
            </div>
            <h2 className="text-3xl font-black tracking-tighter">{currency(totalMonthTransfers)}</h2>
            <p className="text-xs mt-2 opacity-70 font-medium italic">{currentMonthTransfers.length} operações realizadas no período.</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {displayedTransfers.length === 0 ? (
          <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
            Nenhuma transferência registrada neste período.
          </div>
        ) : (
          displayedTransfers.map(transfer => (
            <div key={transfer.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-6 shadow-sm hover:shadow-md transition-all group">
              
              <div className="flex flex-col items-center md:items-start min-w-[120px]">
                <div className="flex items-center gap-2 text-slate-500 text-sm font-bold">
                  <Calendar size={16} className="text-slate-300" />
                  {date(transfer.transfer_date)}
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Por: Sistema</span>
              </div>

              <div className="flex-1 flex flex-col md:flex-row items-center gap-4 w-full">
                <div className="flex-1 flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 w-full md:w-auto shadow-inner">
                  <div className="p-2 bg-rose-50 rounded-xl text-rose-600"><Wallet size={18} /></div>
                  <div className="overflow-hidden">
                    <p className="text-[9px] text-rose-500 font-black uppercase tracking-tighter">Origem (Saída)</p>
                    <p className="text-sm font-black text-slate-700 truncate uppercase" title={getAccountLabel(transfer.account_from_id)}>{getAccountLabel(transfer.account_from_id)}</p>
                  </div>
                </div>

                <div className="text-slate-300">
                  <ArrowRight size={24} className="hidden md:block" />
                  <ArrowRight size={24} className="md:hidden rotate-90" />
                </div>

                <div className="flex-1 flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 w-full md:w-auto shadow-inner">
                  <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><Wallet size={18} /></div>
                  <div className="overflow-hidden">
                    <p className="text-[9px] text-emerald-500 font-black uppercase tracking-tighter">Destino (Entrada)</p>
                    <p className="text-sm font-black text-slate-700 truncate uppercase" title={getAccountLabel(transfer.account_to_id)}>{getAccountLabel(transfer.account_to_id)}</p>
                  </div>
                </div>
              </div>

              <div className="text-center md:text-right min-w-[220px] flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                <div>
                  <p className="text-lg font-black text-slate-900 tracking-tighter">{currency(transfer.amount)}</p>
                  <p className="text-[10px] text-slate-500 font-medium italic mt-1 line-clamp-1">{transfer.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTransfer(transfer);
                      setIsAddModalOpen(true);
                    }}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                    title="Editar transferência"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferToDelete(transfer)}
                    className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                    title="Excluir transferência"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      <FinancialRecordForm 
        isOpen={isAddModalOpen} 
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTransfer(null);
        }}
        onSave={editingTransfer ? handleUpdateTransfer : handleAddTransfer}
        type="transfer"
        initialData={editingTransfer ? {
          id: editingTransfer.id,
          transferDate: editingTransfer.transfer_date,
          fromAccountId: editingTransfer.account_from_id,
          toAccountId: editingTransfer.account_to_id,
          amount: editingTransfer.amount,
          description: editingTransfer.description || 'Transferência entre contas',
        } : undefined}
      />

      <ActionConfirmationModal
        isOpen={!!transferToDelete}
        onClose={() => setTransferToDelete(null)}
        onConfirm={handleDeleteTransfer}
        title="Excluir Transferência"
        message={`Deseja realmente excluir a transferência de ${currency(transferToDelete?.amount || 0)}?`}
        confirmLabel={isDeleting ? 'Excluindo...' : 'Excluir'}
        cancelLabel="Cancelar"
      />

    </div>
  );
};

export default TransfersTab;
