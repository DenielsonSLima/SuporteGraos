import React from 'react';
import { ArrowLeft, ShieldCheck, UserCheck } from 'lucide-react';

interface Props {
  orderNumber: string | number;
  orderStatus: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenPdf: (variant: 'producer' | 'internal') => void;
  onReopen?: () => void;
  onCancel?: () => void;
}

const SalesOrderActionButtons: React.FC<Props> = ({ 
  orderNumber, 
  orderStatus, 
  onBack, 
  onEdit, 
  onDelete, 
  onOpenPdf,
  onReopen,
  onCancel
}) => {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all shadow-sm">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Venda {orderNumber}</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Status: {orderStatus}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onOpenPdf('producer')}
          className="px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-[10px] font-black uppercase text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
        >
          <UserCheck size={16} /> PDF Cliente
        </button>
        <button
          onClick={() => onOpenPdf('internal')}
          className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2"
        >
          <ShieldCheck size={16} /> Auditoria
        </button>
        <div className="w-px h-10 bg-slate-200 mx-2"></div>
        {orderStatus === 'completed' ? (
          <button 
            onClick={onReopen} 
            className="px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-black uppercase text-indigo-600 hover:bg-indigo-100 transition-all shadow-sm"
          >
            Reabrir Venda
          </button>
        ) : (
          <>
            {orderStatus !== 'canceled' && (
              <button
                onClick={onCancel}
                className="px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-black uppercase text-rose-700 hover:bg-rose-100 transition-all shadow-sm"
              >
                Cancelar Venda
              </button>
            )}
            <button onClick={onEdit} className="px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black uppercase text-slate-700 hover:bg-slate-50 transition-all">Editar</button>
            <button onClick={onDelete} className="px-4 py-2.5 bg-white border border-rose-200 rounded-xl text-xs font-black uppercase text-rose-600 hover:bg-rose-50 transition-all">Excluir</button>
          </>
        )}
      </div>
    </div>
  );
};

export default SalesOrderActionButtons;
