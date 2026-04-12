
import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, User, Tag, Clock, CheckCircle2, AlertCircle, Wallet, FileText, ArrowLeft, Trash2, Edit, RotateCcw } from 'lucide-react';
import ModalPortal from '../../../../components/ui/ModalPortal';
import { FinancialRecord } from '../../types';
import { financialEntriesService } from '../../../../services/financialEntriesService';
import { financialTransactionsService } from '../../../../services/financialTransactionsService';
import { useAccounts } from '../../../../hooks/useAccounts';
import ActionConfirmationModal from '../../../../components/ui/ActionConfirmationModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  record: FinancialRecord | null;
  onPay: (record: FinancialRecord) => void;
  onEdit: (record: FinancialRecord) => void;
  onDelete: (record: FinancialRecord) => void;
  onReversePayment?: (transactionId: string) => Promise<void>;
}

const AdminExpenseQuickView: React.FC<Props> = ({ isOpen, onClose, record, onPay, onEdit, onDelete, onReversePayment }) => {
  const { data: accounts = [] } = useAccounts();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reverseConfirmTx, setReverseConfirmTx] = useState<any | null>(null);
  const [isReversing, setIsReversing] = useState(false);

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!record || !isOpen) return;
      setIsLoading(true);
      try {
        // 1. Get Entry ID via service
        const entries = await financialEntriesService.getByOrigin('expense', record.id);
        const entryIds = entries.map(e => e.id);

        if (entryIds.length > 0) {
          // 2. Get Transaction history via service
          const txs = await financialTransactionsService.getByEntry(entryIds[0]);
          setTransactions(txs || []);
        } else {
          setTransactions([]);
        }
      } catch (err) {
        console.error('Error fetching transactions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

  const isPaid = record.status === 'paid';
  const isOverdue = record.status === 'overdue';

  const getAccountName = (id: string) => {
    const acc = accounts.find(a => a.id === id);
    return acc ? `${acc.account_name} - ${acc.owner || 'Sem Dono'}` : 'Conta desconhecida';
  };

  const modalContent = (
    <div className="fixed inset-0 z-[110] flex justify-end animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-slate-50 shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-500">
        
        {/* Header */}
        <div className="bg-white px-8 py-8 border-b border-slate-200">
          <div className="flex justify-between items-start mb-6">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-3">
              <ArrowLeft size={24} className="text-slate-600" />
            </button>
            <div className="flex gap-2">
              <button 
                onClick={() => onEdit(record)}
                className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Edit size={20} />
              </button>
              <button 
                onClick={() => onDelete(record)}
                className="p-2.5 bg-white border border-slate-200 text-rose-600 rounded-xl hover:bg-rose-50 transition-colors shadow-sm"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
               <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border 
                  ${isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                    isOverdue ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                    'bg-amber-50 text-amber-600 border-amber-100'}`}>
                  {isPaid ? 'Liquidado' : isOverdue ? 'Vencido' : 'Pendente'}
               </span>
               <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">
                  {record.category}
                </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">{record.description}</h2>
            <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
               <User size={14} />
               {record.entityName}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* Main Stats Card */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col gap-8">
               <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Valor da Despesa</span>
                    <h4 className="text-3xl font-black">{currency(record.originalValue)}</h4>
                  </div>
                  {record.paidValue > 0 && record.paidValue < record.originalValue && (
                    <div className="text-right">
                       <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Saldo Restante</span>
                       <h4 className="text-xl font-bold text-amber-400">{currency(record.originalValue - record.paidValue)}</h4>
                    </div>
                  )}
               </div>

               <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/10">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Emissão</span>
                    <div className="flex items-center gap-2 font-bold text-sm">
                       <Calendar size={14} /> {date(record.issueDate)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Vencimento</span>
                    <div className="flex items-center gap-2 font-bold text-sm">
                       <Clock size={14} /> {date(record.dueDate)}
                    </div>
                  </div>
               </div>
            </div>
            {/* Background design element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          </div>

          {/* Quick Action Payment */}
          {!isPaid && (
            <div className="bg-emerald-600 rounded-3xl p-6 text-white shadow-lg shadow-emerald-200 flex items-center justify-between">
              <div>
                <p className="font-black uppercase text-xs tracking-widest opacity-80 mb-1">Deseja quitar agora?</p>
                <p className="font-bold text-lg">Baixa rápida</p>
              </div>
              <button 
                onClick={() => onPay(record)}
                className="bg-white text-emerald-700 px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all hover:bg-slate-50"
              >
                Realizar Pagamento
              </button>
            </div>
          )}

          {/* Payment History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
               <h3 className="font-black text-sm uppercase tracking-widest text-slate-400">Histórico de Pagamentos</h3>
            </div>

            {isLoading ? (
              <div className="bg-white rounded-3xl p-8 border border-dashed border-slate-200 flex items-center justify-center">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between group hover:border-emerald-200 transition-colors">
                    <div className="flex items-center gap-4">
                       <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                          <Wallet size={18} />
                       </div>
                       <div>
                          <p className="text-xs font-black text-slate-800 uppercase leading-none mb-1">{getAccountName(tx.account_id)}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{date(tx.transaction_date)} • {tx.description || 'Pagamento'}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-slate-900">{currency(tx.amount)}</span>
                      {onReversePayment && (
                        <button
                          onClick={() => setReverseConfirmTx(tx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Reverter pagamento"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] p-10 border-2 border-dashed border-slate-200 flex flex-col items-center text-center">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <DollarSign size={24} className="text-slate-300" />
                 </div>
                 <p className="text-sm font-bold text-slate-400 px-8">Nenhum pagamento registrado para esta despesa ainda.</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {record.notes && (
            <div className="space-y-2">
               <h3 className="font-black text-sm uppercase tracking-widest text-slate-400">Observações</h3>
               <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs font-bold text-amber-700 italic">
                  "{record.notes}"
               </div>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="bg-slate-100 px-8 py-4 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {record.id}</p>
        </div>

      </div>

      {/* Confirmation modal for reversing payment */}
      <ActionConfirmationModal
        isOpen={!!reverseConfirmTx}
        onClose={() => setReverseConfirmTx(null)}
        onCancel={() => setReverseConfirmTx(null)}
        onConfirm={async () => {
          if (!reverseConfirmTx || !onReversePayment) return;
          setIsReversing(true);
          try {
            await onReversePayment(reverseConfirmTx.id);
            // Refresh transactions list
            setTransactions(prev => prev.filter(t => t.id !== reverseConfirmTx.id));
          } finally {
            setIsReversing(false);
            setReverseConfirmTx(null);
          }
        }}
        title="Reverter Pagamento"
        description={
          <>
            Tem certeza que deseja reverter o pagamento de{' '}
            <span className="font-black">{reverseConfirmTx ? currency(reverseConfirmTx.amount) : ''}</span>
            {reverseConfirmTx && (
              <> na conta <span className="font-black">{getAccountName(reverseConfirmTx.account_id)}</span></>
            )}
            ?<br />
            O valor será devolvido ao saldo da conta e a despesa voltará ao status "em aberto".
          </>
        }
        confirmLabel={isReversing ? 'Revertendo...' : 'Sim, Reverter'}
        cancelLabel="Cancelar"
        type="danger"
      />
    </div>
  );

  return (
    <ModalPortal>
      {modalContent}
    </ModalPortal>
  );
};

export default AdminExpenseQuickView;
