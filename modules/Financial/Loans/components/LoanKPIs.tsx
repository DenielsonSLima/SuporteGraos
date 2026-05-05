
import React from 'react';
import { Landmark, ArrowUpRight, ArrowDownLeft, Scale, FileText } from 'lucide-react';
import { useLoansActiveTotals } from '../../../../hooks/useLoans';

const LoanKPIs: React.FC = () => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  // ✅ ZERO CÁLCULO NO FRONTEND — totais via RPC server-side
  const { data: totals } = useLoansActiveTotals();
  const stats = {
    takenTotal: totals?.takenRemaining ?? 0,
    grantedTotal: totals?.grantedRemaining ?? 0,
    countActive: totals?.countActive ?? 0,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
      {/* Tomados */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-rose-300 transition-all">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Dívidas (Tomados)</p>
          <h3 className="text-xl font-black text-rose-600 tracking-tighter">{currency(stats.takenTotal)}</h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 italic leading-none">Saldo devedor</p>
        </div>
        <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 shadow-sm shadow-rose-200/50">
          <ArrowDownLeft size={20} />
        </div>
      </div>

      {/* Concedidos */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-emerald-300 transition-all">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Créditos (Concedidos)</p>
          <h3 className="text-xl font-black text-emerald-600 tracking-tighter">{currency(stats.grantedTotal)}</h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 italic leading-none">Saldo a receber</p>
        </div>
        <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-200/50">
          <ArrowUpRight size={20} />
        </div>
      </div>

      {/* Saldo Líquido */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-all">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Saldo Líquido</p>
          <h3 className={`text-xl font-black tracking-tighter ${stats.grantedTotal - stats.takenTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {currency(stats.grantedTotal - stats.takenTotal)}
          </h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 leading-none">Balanço Geral</p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 text-slate-600 shadow-sm">
          <Scale size={20} />
        </div>
      </div>

      {/* Contratos Ativos */}
      <div className="bg-slate-900 p-5 rounded-3xl shadow-xl flex items-center justify-between text-white border border-slate-800 group">
        <div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Contratos Ativos</p>
           <h3 className="text-xl font-black text-blue-400 tracking-tighter">
             {stats.countActive} <span className="text-xs text-slate-400 uppercase font-bold ml-1 tracking-normal">Unidades</span>
           </h3>
           <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 leading-none">Operações vigentes</p>
        </div>
        <div className="p-3 bg-slate-800 rounded-2xl text-blue-400 group-hover:scale-110 transition-transform shadow-lg shadow-black/40">
          <FileText size={20} />
        </div>
      </div>
    </div>
  );
};

export default LoanKPIs;
