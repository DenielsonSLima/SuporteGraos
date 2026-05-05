
import React from 'react';
import { Landmark, ChevronRight, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { LoanRecord } from '../../types';

interface Props {
  loan: LoanRecord;
  onSelect: (id: string) => void;
}

const LoanCard: React.FC<Props> = ({ loan, onSelect }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  
  // Cálculos de progresso (Baseado em valores que já vieram prontos do DB)
  const total = loan.totalValue || 0;
  const remaining = loan.remainingValue || 0;
  const paid = loan.paidValue || 0;
  const progressPercent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  const isTaken = loan.type === 'taken';

  return (
    <div 
      onClick={() => onSelect(loan.id)}
      className="group cursor-pointer bg-white rounded-[2rem] border border-slate-200 p-5 shadow-sm hover:shadow-2xl hover:border-blue-400 transition-all relative overflow-hidden flex flex-col h-full"
    >
      {/* Header com Status */}
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl ${isTaken ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
          <Landmark size={20} />
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border shadow-sm ${
            loan.status === 'active' 
              ? 'bg-blue-50 text-blue-700 border-blue-100' 
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}>
            {loan.status === 'active' ? 'Ativo' : 'Liquidado'}
          </span>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
            {isTaken ? 'Dívida / Tomado' : 'Crédito / Concedido'}
          </span>
        </div>
      </div>
      
      {/* Nome e Data */}
      <div className="mb-4">
        <h3 className="text-sm font-black text-slate-900 tracking-tight whitespace-pre-wrap leading-tight mb-0.5 group-hover:text-blue-600 transition-colors">
          {loan.entityName}
        </h3>
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
          Contrato: {(() => {
            const [y, m, d] = loan.contractDate.split(/[-T/]/).map(Number);
            return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
          })()}
        </p>
      </div>

      {/* Detalhes de Valores */}
      <div className="grid grid-cols-2 gap-3 mb-5 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
        <div>
          <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Valor Total</span>
          <p className="text-xs font-black text-slate-700 tracking-tighter">{currency(total)}</p>
        </div>
        <div className="text-right">
          <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">{isTaken ? 'Já Pagou' : 'Já Recebeu'}</span>
          <p className="text-xs font-black text-blue-600 tracking-tighter">{currency(paid)}</p>
        </div>
      </div>

      {/* Barra de Progresso */}
      <div className="mb-5 space-y-1.5 px-1">
        <div className="flex justify-between items-end">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Evolução</span>
          <span className="text-[10px] font-black text-slate-800 italic">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
          <div 
            className={`h-full transition-all duration-1000 ease-out rounded-full ${
              progressPercent >= 100 ? 'bg-emerald-500' : isTaken ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Rodapé - Saldo Pendente */}
      <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-end">
        <div>
          <span className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">Saldo Pendente</span>
          <p className={`text-xl font-black tracking-tighter ${isTaken ? 'text-rose-600' : 'text-emerald-600'}`}>
            {currency(remaining)}
          </p>
        </div>
        <div className="p-1.5 bg-slate-50 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
          <ChevronRight size={16} />
        </div>
      </div>
    </div>
  );
};

export default LoanCard;
