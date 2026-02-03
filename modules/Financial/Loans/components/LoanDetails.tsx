
import React, { useState, useMemo } from 'react';
import { ArrowLeft, Plus, History, Landmark, DollarSign, Wallet, ArrowDownCircle, ArrowUpCircle, Printer, Trash2, AlertTriangle, Pencil } from 'lucide-react';
import { LoanRecord, LoanTransaction } from '../../types';
import LoanTransactionModal from './LoanTransactionModal';
import LoanPdfModal from './LoanPdfModal';
import ActionConfirmationModal from '../../../../components/ui/ActionConfirmationModal';
import { useToast } from '../../../../contexts/ToastContext';
import { loansService } from '../../../../services/financial/loansService';
import { financialActionService } from '../../../../services/financialActionService';
import { bankAccountService } from '../../../../services/bankAccountService';
import { standaloneRecordsService } from '../../../../services/standaloneRecordsService';

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
  const [deletingTxRecord, setDeletingTxRecord] = useState<any | null>(null);
  const [editingTx, setEditingTx] = useState<(Omit<LoanTransaction, 'id'> & { id?: string }) | null>(null);
  const [txVersion, setTxVersion] = useState(0);
  const { addToast } = useToast();
  
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const dateStr = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const getBankAccountName = (bankAccountId?: string, description?: string) => {
    if (!bankAccountId) {
      if (description && /abatimento|desconto|ajuste/i.test(description)) return 'Desconto';
      return 'Não informada';
    }
    const accounts = bankAccountService.getBankAccounts();
    const account = accounts.find(a => a.id === bankAccountId);
    return account?.bankName || bankAccountId;
  };

  const financialHistory = useMemo(() => {
    return financialActionService.getStandaloneRecords()
      .filter(r => {
        // Mostra apenas o crédito/débito inicial do empréstimo (receipt ou admin)
        // E não mostra o registro principal (loan_taken ou loan_granted) com paidValue=0
        return r.id?.startsWith(loan.id) && ['receipt', 'admin'].includes(r.subType || '') && r.paidValue > 0;
      })
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [loan.id, txVersion]);

  const getTxTypeFromRecord = (subType?: string): 'increase' | 'decrease' => {
    if (loan.type === 'taken') return subType === 'receipt' ? 'increase' : 'decrease';
    return subType === 'receipt' ? 'decrease' : 'increase';
  };

  const resolveSubTypeFromTx = (type: 'increase' | 'decrease') => {
    const isEntry = (loan.type === 'taken' && type === 'increase') || (loan.type === 'granted' && type === 'decrease');
    return isEntry ? 'receipt' : 'admin';
  };

  const applyTxEffect = (record: any, type: 'increase' | 'decrease', value: number, sign: 1 | -1) => {
    if (type === 'increase') record.originalValue = (record.originalValue || 0) + sign * value;
    if (type === 'decrease') record.paidValue = (record.paidValue || 0) + sign * value;
  };

  const handleAddTx = async (tx: Omit<LoanTransaction, 'id'> & { id?: string }) => {
    try {
      const current = loansService.getById(loan.id);
      if (!current) {
        addToast('error', 'Empréstimo não encontrado');
        return;
      }

      const updated = { ...current } as any;

      // Se EDITANDO (tem ID), remove efeito antigo
      if (tx.id) {
        const existing = financialActionService.getStandaloneRecords().find(r => r.id === tx.id);
        if (existing) {
          const oldType = getTxTypeFromRecord(existing.subType);
          const oldValue = existing.paidValue || 0;
          applyTxEffect(updated, oldType, oldValue, -1);
        }
      }

      // Aplica novo efeito
      applyTxEffect(updated, tx.type, tx.value, 1);
      updated.status = updated.paidValue >= updated.originalValue - 0.01 ? 'paid' : updated.paidValue > 0 ? 'partial' : 'pending';
      await loansService.update(updated);

      // SALVAR ou ATUALIZAR registro
      if (tx.id) {
        // EDITANDO: atualiza registro existente
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
        // CRIANDO NOVO com conta: salva como transação real
        const subType = resolveSubTypeFromTx(tx.type);
        const txId = Math.random().toString(36).substr(2, 9);

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
        // CRIANDO NOVO abatimento sem conta: salva como ajuste/desconto
        const subType = resolveSubTypeFromTx(tx.type);
        const txId = Math.random().toString(36).substr(2, 9);

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
          bankAccount: undefined // SEM conta bancária
        });
      }

      setEditingTx(null);
      setIsTxModalOpen(false);
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
      console.error('Erro ao salvar lançamento:', error);
      addToast('error', 'Erro ao salvar lançamento', (error as any).message);
    }
  };

  const handleEditTx = (record: any) => {
    const type = getTxTypeFromRecord(record.subType);
    setEditingTx({
      id: record.id,
      date: record.issueDate,
      type,
      value: record.paidValue || 0,
      description: record.description,
      accountId: record.bankAccount,
      accountName: getBankAccountName(record.bankAccount),
      isHistorical: false
    });
    setIsTxModalOpen(true);
  };

  const handleDeleteTx = (record: any) => {
    setDeletingTxRecord(record);
    setIsDeleteTxModalOpen(true);
  };

  const confirmDeleteTx = async () => {
    if (!deletingTxRecord) return;
    try {
      const current = loansService.getById(loan.id);
      if (!current) {
        addToast('error', 'Empréstimo não encontrado');
        return;
      }
      const updated = { ...current } as any;
      const oldType = getTxTypeFromRecord(deletingTxRecord.subType);
      const oldValue = deletingTxRecord.paidValue || 0;
      applyTxEffect(updated, oldType, oldValue, -1);
      updated.status = updated.paidValue >= updated.originalValue - 0.01 ? 'paid' : updated.paidValue > 0 ? 'partial' : 'pending';
      await loansService.update(updated);
      await financialActionService.deleteStandaloneRecord(deletingTxRecord.id);
      setIsDeleteTxModalOpen(false);
      setDeletingTxRecord(null);
      setTxVersion(v => v + 1);
      onUpdate();
      addToast('success', 'Movimentação excluída');
    } catch (error) {
      console.error('Erro ao deletar:', error);
      addToast('error', 'Erro ao excluir movimentação', (error as any).message);
    }
  };

  const handleDeleteContract = () => {
    loansService.delete(loan.id);
    addToast('success', 'Empréstimo excluído');
    onBack();
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
            <div className="absolute right-0 top-0 p-6 opacity-10"><Landmark size={80}/></div>
            
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
              <p className="text-sm font-black">{loan.bankAccountName || 'Não informada'}</p>
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
                                      onClick={() => handleEditTx(record)}
                                      className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
                                      aria-label="Editar lançamento"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTx(record)}
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
        onSave={handleAddTx}
        loanType={loan.type}
        initialTx={editingTx || undefined}
      />
      <LoanPdfModal isOpen={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} loan={loan} history={financialHistory} />
      
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
        onConfirm={confirmDeleteTx} 
        title="Excluir Movimentação?" 
        description={<p>Tem certeza que deseja apagar esta movimentação? <strong>{deletingTxRecord?.description}</strong></p>} 
        type="danger" 
      />
    </div>
  );
};

export default LoanDetails;
