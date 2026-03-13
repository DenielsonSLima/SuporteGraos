
import React, { useState } from 'react';
import { ArrowLeft, Plus, History, Landmark, DollarSign, Wallet, ArrowDownCircle, ArrowUpCircle, Printer, Trash2, AlertTriangle, Pencil } from 'lucide-react';
import { LoanRecord, LoanTransaction } from '../../types';
import LoanTransactionModal from './LoanTransactionModal';
import LoanPdfModal from './LoanPdfModal';
import ActionConfirmationModal from '../../../../components/ui/ActionConfirmationModal';
import { useToast } from '../../../../contexts/ToastContext';
import { useAccounts } from '../../../../hooks/useAccounts';
import { useLoanDetails } from '../hooks/useLoanDetails';

interface Props {
  loan: LoanRecord;
  onBack: () => void;
  onUpdate: () => void;
}

const LoanDetails: React.FC<Props> = ({ loan, onBack, onUpdate }) => {
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
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
  const dateStr = (val: string) => new Date(val).toLocaleDateString('pt-BR');

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

  return (
    <div className="animate-in slide-in-from-right-4 duration-300 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{loan.entityName}</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Contrato {loan.type === 'taken' ? 'Tomado' : 'Concedido'} • {loan.status === 'active' ? 'Em Aberto' : 'Liquidado'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="flex items-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all active:scale-95"
          >
            <Printer size={18} /> Imprimir
          </button>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-3 bg-white border-2 border-rose-100 text-rose-500 rounded-2xl hover:bg-rose-50 transition-all"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={() => {
              setEditingTx(null);
              setIsTxModalOpen(true);
            }}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95"
          >
            <Plus size={18} /> Novo Lançamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`p-8 rounded-[2rem] border-2 shadow-xl flex flex-col justify-between relative overflow-hidden ${loan.type === 'taken' ? 'bg-rose-600 border-rose-500' : 'bg-emerald-600 border-emerald-500'} text-white`}>
          <div className="absolute right-0 top-0 p-6 opacity-10"><Landmark size={80} /></div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-4 block">Detalhes do Contrato</span>
            <div className="space-y-4">
              <div>
                <span className="text-[9px] font-black uppercase opacity-70 block">Data</span>
                <p className="text-lg font-black">{dateStr(loan.contractDate)}</p>
              </div>
              <div>
                <span className="text-[9px] font-black uppercase opacity-70 block">Valor do Empréstimo</span>
                <p className="text-2xl font-black">{currency(loan.originalValue)}</p>
              </div>
              <div>
                <span className="text-[9px] font-black uppercase opacity-70 block">Valor Pago</span>
                <p className="text-lg font-black">{currency(loan.originalValue - loan.remainingValue)}</p>
              </div>
              <div className="border-t border-white border-opacity-20 pt-4">
                <span className="text-[9px] font-black uppercase opacity-70 block">Valor Pendente</span>
                <p className="text-2xl font-black">{currency(loan.remainingValue)}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white border-opacity-20">
            <span className="text-[9px] font-black uppercase opacity-70 block mb-2">Conta Bancária</span>
            <p className="text-sm font-black">{getBankAccountName(loan.accountId || (loan as any).bankAccount, (loan as any).description || '')}</p>
            <div className="mt-3 flex gap-3 text-[9px] font-black uppercase opacity-60">
              <span>Taxa: {loan.interestRate}% A.M</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <History size={18} className="text-blue-500" />
            <h3 className="font-black uppercase text-xs tracking-widest text-slate-700">Extrato Interno de Movimentações</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Descrição</th>
                  <th className="px-6 py-3">Conta Bancária</th>
                  <th className="px-6 py-3 text-right">Valor</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {financialHistory.map((record) => {
                  const isCredit = record.subType === 'receipt';
                  return (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-500">{dateStr(record.issueDate)}</td>
                      <td className="px-6 py-4 font-bold text-slate-800 uppercase text-xs">
                        {record.description}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 font-semibold">
                        {getBankAccountName(record.bankAccount, record.description)}
                      </td>
                      <td className={`px-6 py-4 text-right font-black ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isCredit ? '+' : '-'}{currency(record.paidValue || record.amount || 0)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => onEditTx(record)}
                            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
                            aria-label="Editar lançamento"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTx(record)}
                            className="p-2 rounded-lg border border-rose-100 text-rose-500 hover:bg-rose-50"
                            aria-label="Excluir lançamento"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {financialHistory.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-xs font-semibold">
                      Nenhuma movimentação registrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
      <LoanPdfModal isOpen={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} loan={loan} history={financialHistory as any[]} />

      <ActionConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteContract}
        title="Excluir Contrato?"
        description={<p>Tem certeza que deseja apagar o contrato com <strong>{loan.entityName}</strong>? Todos os lançamentos internos serão perdidos.</p>}
        type="danger"
      />
      <ActionConfirmationModal
        isOpen={isDeleteTxModalOpen}
        onClose={() => {
          setIsDeleteTxModalOpen(false);
          setDeletingTxRecord(null);
        }}
        onConfirm={onConfirmDeleteTx}
        title="Excluir Movimentação?"
        description={<p>Tem certeza que deseja apagar esta movimentação? <strong>{deletingTxRecord?.description}</strong></p>}
        type="danger"
      />
    </div>
  );
};

export default LoanDetails;
