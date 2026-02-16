
import React, { useState } from 'react';
import { DollarSign, CreditCard, Plus, ArrowUpRight, Calendar, Wallet, Pencil, Trash2, Landmark, MinusCircle } from 'lucide-react';
import { OrderTransaction } from '../../types';
import { formatDateBR } from '../../../../utils/dateUtils';
import TransactionManagementModal from '../../../Financial/components/modals/TransactionManagementModal';
import { purchaseService } from '../../../../services/purchaseService';

interface Props {
  orderId: string;
  transactions: OrderTransaction[];
  totalOrderValue: number;
  onAddPayment: () => void;
  onAddAdvance: () => void;
  onRefresh: () => void;
  onDeleteTx: (id: string) => void;
}

const OrderFinancialCard: React.FC<Props> = ({ orderId, transactions, totalOrderValue, onAddPayment, onAddAdvance, onRefresh, onDeleteTx }) => {
  const [selectedTx, setSelectedTx] = useState<OrderTransaction | null>(null);
  
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const date = (val: string) => formatDateBR(val);

  const financialTransactions = transactions.filter(t => t.type === 'payment' || t.type === 'advance' || t.type === 'receipt');
  
  const totalSettled = financialTransactions.reduce((acc, t) => acc + (t.value || 0) + (t.discountValue || 0), 0);
  const progress = totalOrderValue > 0 ? Math.min((totalSettled / totalOrderValue) * 100, 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-fit">
      <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex justify-between items-center">
        <div className="flex items-center gap-2 text-emerald-800">
          <DollarSign size={20} />
          <h3 className="font-bold uppercase text-xs tracking-widest">Pagamentos Produtor (Fluxo de Caixa)</h3>
        </div>
        <div className="flex gap-2">
          {/* Botão de Adiantamento Distinto */}
          <button 
            onClick={onAddAdvance} 
            className="text-[10px] bg-amber-100 border border-amber-200 text-amber-800 hover:bg-amber-200 px-3 py-1.5 rounded-lg font-black uppercase transition-colors flex items-center gap-1 shadow-sm"
          >
            <CreditCard size={14} />
            Adiantamento
          </button>
          
          <button 
            onClick={onAddPayment} 
            className="text-[10px] bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-lg font-black uppercase transition-colors flex items-center gap-1 shadow-md active:scale-95"
          >
            <Plus size={14} />
            Pagamento
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6">
          <div className="flex justify-between text-[10px] mb-2 font-black uppercase text-slate-400 tracking-widest">
            <span>Quitação do Contrato (Inc. Abatimentos)</span>
            <span className="text-emerald-700">{progress.toFixed(1)}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="space-y-3">
          {financialTransactions.length === 0 ? (
            <p className="text-xs text-slate-300 italic uppercase font-bold text-center py-4">Sem lançamentos realizados</p>
          ) : (
            financialTransactions.map(t => {
              const txSettledValue = (t.value || 0) + (t.discountValue || 0);
              const isPureAdjustment = (t.value === 0 && (t.discountValue || 0) > 0);
              const isAdvance = t.type === 'advance';

              return (
                <div key={t.id} className={`flex flex-col p-3 rounded-xl border transition-all group relative ${isAdvance ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-200 hover:bg-white'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isPureAdjustment ? 'bg-gray-200 text-gray-600' : (isAdvance ? 'bg-amber-200 text-amber-800' : 'bg-emerald-100 text-emerald-700')}`}>
                        {isPureAdjustment ? <MinusCircle size={14} /> : (isAdvance ? <CreditCard size={14} /> : <ArrowUpRight size={14} />)}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-[10px] uppercase">
                          {isPureAdjustment ? 'Abatimento / Quebra' : (isAdvance ? 'Adiantamento Concedido' : 'Pagamento')}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{date(t.date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                        <span className={`font-black text-sm ${isAdvance ? 'text-amber-700' : 'text-slate-900'}`}>{currency(txSettledValue)}</span>
                        {isPureAdjustment && <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Sem Caixa</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-white/60 border border-slate-200/50 px-2 py-1 rounded-lg w-fit shadow-sm">
                    <Landmark size={12} className="text-slate-400" />
                    <span className="text-[9px] font-black text-indigo-700 uppercase tracking-tighter">{t.accountName}</span>
                  </div>

                  <div className="absolute right-2 bottom-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => setSelectedTx(t)} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 transition-all shadow-sm"><Pencil size={12}/></button>
                      <button onClick={() => onDeleteTx(t.id)} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-600 transition-all shadow-sm"><Trash2 size={12}/></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedTx && (
        <TransactionManagementModal 
            isOpen={!!selectedTx} onClose={() => setSelectedTx(null)} 
            transaction={selectedTx} onUpdate={(tx) => { purchaseService.updateTransaction(orderId, tx); onRefresh(); setSelectedTx(null); }} 
            onDelete={(id) => { onDeleteTx(id); setSelectedTx(null); }}
        />
      )}
    </div>
  );
};

export default OrderFinancialCard;
