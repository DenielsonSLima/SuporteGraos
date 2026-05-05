
import React from 'react';
import { ArrowLeft, Printer, Trash2, Pencil, Plus } from 'lucide-react';
import { LoanRecord } from '../../types';

interface Props {
  loan: LoanRecord;
  onBack: () => void;
  onEdit: () => void;
  onPrint: () => void;
  onDelete: () => void;
  onNewTransaction: () => void;
}

const LoanDetailsHeader: React.FC<Props> = ({ 
  loan, onBack, onEdit, onPrint, onDelete, onNewTransaction 
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack} 
          className="p-2 rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tighter whitespace-pre-wrap break-words leading-tight max-w-2xl">
            {loan.entityName}
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
            Contrato {loan.type === 'taken' ? 'Tomado' : 'Concedido'} • {loan.status === 'active' ? 'Em Aberto' : 'Liquidado'}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex items-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all active:scale-95"
        >
          <Pencil size={18} /> Editar
        </button>
        <button
          onClick={onPrint}
          className="flex items-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all active:scale-95"
        >
          <Printer size={18} /> Imprimir
        </button>
        <button
          onClick={onDelete}
          className="p-3 bg-white border-2 border-rose-100 text-rose-500 rounded-2xl hover:bg-rose-50 transition-all"
        >
          <Trash2 size={18} />
        </button>
        <button
          onClick={onNewTransaction}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95"
        >
          <Plus size={18} /> Novo Lançamento
        </button>
      </div>
    </div>
  );
};

export default LoanDetailsHeader;
