import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { FinancialRecord } from '../../types';

interface Props {
  credit: FinancialRecord;
  onEdit: () => void;
  onDelete: () => void;
}

const CreditDetails: React.FC<Props> = ({ credit, onEdit, onDelete }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const dateStr = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
      <div className="space-y-6">
        
        {/* Cabeçalho */}
        <div className="pb-6 border-b border-slate-100">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Crédito</p>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">{credit.description || '-'}</h2>
            </div>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${credit.status === 'paid' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-700'}`}>
              {credit.status === 'paid' ? 'Recebido' : credit.status === 'pending' ? 'Pendente' : 'Parcial'}
            </span>
          </div>
        </div>

        {/* Valores Principais */}
        <div className="space-y-4">
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Capital Investido</p>
            <p className="text-3xl font-black text-emerald-700 tracking-tighter">{currency(credit.originalValue || 0)}</p>
          </div>

          {credit.dueDate && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Data Inicial</p>
                <p className="text-sm font-black text-slate-800">{dateStr(credit.issueDate)}</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Vencimento</p>
                <p className="text-sm font-black text-slate-800">{dateStr(credit.dueDate)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Observações */}
        {credit.notes && (
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Observações</p>
            <p className="text-sm text-slate-700 break-words">{credit.notes}</p>
          </div>
        )}

        {/* Ações */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-2xl font-bold transition-all"
          >
            <Edit2 size={16} />
            Editar
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-bold transition-all"
          >
            <Trash2 size={16} />
            Remover
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreditDetails;
