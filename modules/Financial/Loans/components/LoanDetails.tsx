
import React, { useState, useMemo } from 'react';
import { ArrowLeft, Plus, History, Landmark, DollarSign, Wallet, ArrowDownCircle, ArrowUpCircle, Printer, Trash2, AlertTriangle } from 'lucide-react';
import { LoanRecord, LoanTransaction } from '../../types';
import LoanTransactionModal from './LoanTransactionModal';
import LoanPdfModal from './LoanPdfModal';
import ActionConfirmationModal from '../../../../components/ui/ActionConfirmationModal';
import { loanService } from '../../../../services/loanService';
import { financialActionService } from '../../../../services/financialActionService';

interface Props {
  loan: LoanRecord;
  onBack: () => void;
  onUpdate: () => void;
}

const LoanDetails: React.FC<Props> = ({ loan, onBack, onUpdate }) => {
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const dateStr = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const financialHistory = useMemo(() => {
    return financialActionService.getStandaloneRecords()
      .filter(r => r.notes?.includes(loan.entityName) && r.notes?.includes('EMPRÉSTIMO'))
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [loan.entityName]);

  const handleAddTx = (tx: Omit<LoanTransaction, 'id'>) => {
    const newTx = { ...tx, id: Math.random().toString(36).substr(2, 9) };
    loanService.addTransaction(loan.id, newTx);
    onUpdate();
    setIsTxModalOpen(false);
  };

  const handleDeleteContract = () => {
    loanService.delete(loan.id);
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
                onClick={() => setIsTxModalOpen(true)}
                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95"
            >
                <Plus size={18} /> Novo Lançamento
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`p-8 rounded-[2rem] border-2 shadow-xl flex flex-col justify-center relative overflow-hidden ${loan.type === 'taken' ? 'bg-rose-600 border-rose-500' : 'bg-emerald-600 border-emerald-500'} text-white`}>
            <div className="absolute right-0 top-0 p-6 opacity-10"><Landmark size={80}/></div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2 block">Saldo Atual do Contrato</span>
            <p className="text-4xl font-black tracking-tighter">{currency(loan.remainingValue)}</p>
            <div className="mt-6 flex gap-4 text-[10px] font-black uppercase opacity-70">
                <span>Taxa: {loan.interestRate}% A.M</span>
                <span>•</span>
                <span>Início: {dateStr(loan.contractDate)}</span>
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
                            <th className="px-6 py-3">Tipo</th>
                            <th className="px-6 py-3">Descrição / Histórico</th>
                            <th className="px-6 py-3 text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loan.transactions?.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-500">{dateStr(tx.date)}</td>
                                <td className="px-6 py-4">
                                    {tx.type === 'increase' ? (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100"><ArrowUpCircle size={10}/> Aporte</span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100"><ArrowDownCircle size={10}/> Baixa</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-800 uppercase text-xs">
                                    {tx.description}
                                    {tx.accountName && <span className="block text-[10px] text-slate-400 font-medium italic mt-0.5">Via {tx.accountName}</span>}
                                    {tx.isHistorical && <span className="ml-2 text-[8px] bg-slate-200 text-slate-500 px-1 rounded uppercase font-black">Histórico</span>}
                                </td>
                                <td className={`px-6 py-4 text-right font-black ${tx.type === 'increase' ? 'text-slate-900' : 'text-emerald-600'}`}>
                                    {tx.type === 'decrease' ? '-' : ''}{currency(tx.value)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      <LoanTransactionModal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} onSave={handleAddTx} loanType={loan.type} />
      <LoanPdfModal isOpen={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} loan={loan} history={financialHistory} />
      
      <ActionConfirmationModal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        onConfirm={handleDeleteContract} 
        title="Excluir Contrato?" 
        description={<p>Tem certeza que deseja apagar o contrato com <strong>{loan.entityName}</strong>? Todos os lançamentos internos serão perdidos.</p>} 
        type="danger" 
      />
    </div>
  );
};

export default LoanDetails;
