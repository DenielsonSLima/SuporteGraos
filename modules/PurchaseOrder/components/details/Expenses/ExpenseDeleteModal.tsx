import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import ModalPortal from '../../../../../components/ui/ModalPortal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  expenseName: string;
  expenseValue: number;
}

const ExpenseDeleteModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, expenseName, expenseValue }) => {
  if (!isOpen) return null;

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
          
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4 shadow-inner">
               <Trash2 size={32} />
            </div>
            
            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight mb-2">Excluir Despesa?</h3>
            <p className="text-sm text-slate-500 font-medium px-4">
              Você está prestes a remover a despesa <span className="font-bold text-slate-800">"{expenseName}"</span> no valor de <span className="font-bold text-rose-600">{currency(expenseValue)}</span>.
            </p>

            <div className="mt-6 w-full p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3 text-left">
               <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
               <div>
                  <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Atenção</p>
                  <p className="text-[10px] text-amber-700 font-bold leading-tight">Esta ação também removerá a transação de saída do banco vinculada a este lançamento.</p>
               </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95"
            >
              Sim, Excluir
            </button>
          </div>

        </div>
      </div>
    </ModalPortal>
  );
};

export default ExpenseDeleteModal;
