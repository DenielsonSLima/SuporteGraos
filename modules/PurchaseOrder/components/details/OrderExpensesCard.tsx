
import React from 'react';
import { Receipt, Plus, Calendar, Wallet, CheckSquare, Pencil, Trash2, Landmark, Info } from 'lucide-react';
import { OrderTransaction } from '../../types';

interface Props {
  orderId: string;
  transactions: OrderTransaction[];
  onAddExpense: () => void;
  onEditTx: (tx: OrderTransaction) => void;
  onDeleteTx: (txId: string) => void;
}

const OrderExpensesCard: React.FC<Props> = ({ transactions, onAddExpense, onEditTx, onDeleteTx }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const expenses = transactions.filter(t => t.type === 'expense');
  const totalExpenses = expenses.reduce((acc, t) => acc + t.value, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="bg-rose-50 px-6 py-4 border-b border-rose-100 flex justify-between items-center">
        <div className="flex items-center gap-2 text-rose-800">
          <Receipt size={20} />
          <h3 className="font-black uppercase text-[10px] tracking-widest italic">Despesas Extras (Taxas/Serviços)</h3>
        </div>
        <button 
          onClick={onAddExpense}
          className="text-[10px] bg-rose-600 text-white hover:bg-rose-700 px-4 py-2 rounded-xl font-black uppercase transition-all shadow-md active:scale-95"
        >
          Lançar Despesa
        </button>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
          <span className="text-[10px] font-black uppercase text-slate-400">Total Lançado</span>
          <span className="text-xl font-black text-rose-600">{currency(totalExpenses)}</span>
        </div>

        <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2">
          {expenses.length === 0 ? (
            <p className="text-xs text-slate-300 italic uppercase font-bold text-center py-4">Nenhuma despesa extra</p>
          ) : (
            expenses.map(t => (
              <div key={t.id} className="group relative flex flex-col p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white transition-all shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="font-black text-slate-800 text-[10px] uppercase truncate max-w-[150px]">{t.notes || 'Despesa'}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span className="font-black text-sm text-rose-600">-{currency(t.value)}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded-lg w-fit shadow-xs">
                      <Landmark size={12} className="text-slate-400" />
                      <span className="text-[9px] font-black text-slate-600 uppercase">{t.accountName}</span>
                  </div>

                  {t.deductFromPartner ? (
                    <div className="bg-amber-50 text-amber-700 text-[8px] px-2 py-1 rounded font-black uppercase border border-amber-100 flex items-center gap-1">
                      <CheckSquare size={10} /> Debitado do Produtor
                    </div>
                  ) : (
                    <div className="bg-slate-200 text-slate-600 text-[8px] px-2 py-1 rounded font-black uppercase flex items-center gap-1">
                      <Info size={10} /> Custo Operacional
                    </div>
                  )}
                </div>

                <div className="absolute right-2 bottom-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => onEditTx(t)} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 transition-all shadow-sm"><Pencil size={12}/></button>
                    <button onClick={() => onDeleteTx(t.id)} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-600 transition-all shadow-sm"><Trash2 size={12}/></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderExpensesCard;
