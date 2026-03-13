
import React, { useState } from 'react';
import { DollarSign, Plus, Calendar, Wallet, CheckCircle2, Pencil, Trash2, Landmark } from 'lucide-react';
import { SalesTransaction } from '../../types';
import TransactionManagementModal from '../../../Financial/components/modals/TransactionManagementModal';
import { useSalesTransactionActions } from '../../hooks/useSalesTransactionActions';
import { formatDateBR } from '../../../../utils/dateUtils';
import { useAccounts } from '../../../../hooks/useAccounts';

interface Props {
  orderId: string;
  transactions: SalesTransaction[];
  totalOrderValue: number;
  onAddReceipt: () => void;
  onRefresh: () => void;
}

const SalesFinancialCard: React.FC<Props> = ({ orderId, transactions, totalOrderValue, onAddReceipt, onRefresh }) => {
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const { updateTransaction, deleteTransaction } = useSalesTransactionActions(orderId);
  const { data: accounts = [] } = useAccounts();

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const dateStr = (val: string) => formatDateBR(val);
  const cleanNotes = (val?: string) => val ? val.replace(/\s*\[ORIGIN:[^\]]+\]\s*/g, ' ').trim() : '';

  // Filtra apenas recebimentos
  const receipts = transactions.filter(t => t.type === 'receipt');

  const totalReceived = receipts.reduce((acc, t) => acc + t.value, 0);
  const pending = Math.max(0, totalOrderValue - totalReceived);
  const progress = totalOrderValue > 0 ? Math.min((totalReceived / totalOrderValue) * 100, 100) : 0;

  const handleUpdateTx = async (updated: any) => {
    await updateTransaction(updated);
    onRefresh();
    setSelectedTx(null);
  };

  const handleDeleteTx = async (id: string) => {
    await deleteTransaction(id);
    onRefresh();
    setSelectedTx(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-fit">
      <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
        <div className="flex items-center gap-2 text-blue-800">
          <DollarSign size={20} />
          <h3 className="font-black uppercase text-[10px] tracking-widest italic">Recebimentos do Pedido</h3>
        </div>
        <button
          onClick={onAddReceipt}
          className="text-[10px] bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-xl font-black uppercase transition-all flex items-center gap-2 shadow-md active:scale-95"
        >
          <Plus size={14} /> Novo Recebimento
        </button>
      </div>

      <div className="p-6">

        {/* Barra de Progresso */}
        <div className="mb-8">
          <div className="flex justify-between text-[10px] mb-2 font-black uppercase text-slate-400 tracking-widest">
            <span>Progresso de Recebimento</span>
            <span className="text-blue-700">{progress.toFixed(1)}%</span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-blue-600 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="flex justify-between mt-3">
            <div>
              <span className="text-slate-400 block text-[9px] font-black uppercase">Já Recebido</span>
              <span className="font-black text-emerald-600 text-xl">{currency(totalReceived)}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[9px] font-black uppercase">Saldo Pendente</span>
              <span className="font-black text-slate-800 text-xl">{currency(pending)}</span>
            </div>
          </div>
        </div>

        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Histórico de Entradas</h4>

        <div className="space-y-3">
          {receipts.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">Aguardando primeiro recebimento</p>
            </div>
          ) : (
            receipts.map(t => {
              const account = accounts.find(a => a.id === t.accountId);
              const accountLabel = account
                ? `${account.account_name}${account.owner ? ` - ${account.owner}` : ''}`
                : t.accountName || 'NÃO INFORMADA';

              return (
                <div key={t.id} className="group relative flex flex-col p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition-all">

                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shadow-sm">
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-sm uppercase tracking-tighter">Recebimento Confirmado</p>
                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Calendar size={12} /> {dateStr(t.date)}
                        </p>
                      </div>
                    </div>
                    <span className="font-black text-lg text-emerald-700 tracking-tighter">{currency(t.value)}</span>
                  </div>

                  <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl mt-1 w-fit">
                    <Landmark size={14} className="text-indigo-600" />
                    <span className="text-[10px] font-black text-indigo-700 uppercase tracking-tighter line-clamp-1">
                      CONTA: {accountLabel}
                    </span>
                  </div>

                  {t.notes && (
                    <p className="text-[10px] text-slate-500 mt-2 italic border-t border-slate-100 pt-2 line-clamp-1 px-1">
                      "{cleanNotes(t.notes)}"
                    </p>
                  )}

                  {/* Botões de Ação */}
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => setSelectedTx(t)}
                      className="p-2 bg-white border border-slate-200 rounded-xl text-blue-600 shadow-xl hover:bg-blue-600 hover:text-white active:scale-90 transition-all"
                      title="Editar Recebimento"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setSelectedTx(t)}
                      className="p-2 bg-white border border-slate-200 rounded-xl text-rose-600 shadow-xl hover:bg-rose-600 hover:text-white active:scale-90 transition-all"
                      title="Excluir/Estornar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedTx && (
        <TransactionManagementModal
          isOpen={!!selectedTx}
          onClose={() => setSelectedTx(null)}
          transaction={selectedTx}
          onUpdate={handleUpdateTx}
          onDelete={handleDeleteTx}
          title="Gerenciar Recebimento"
        />
      )}
    </div>
  );
};

export default SalesFinancialCard;
