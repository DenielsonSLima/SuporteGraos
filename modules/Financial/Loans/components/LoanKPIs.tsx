
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
    netBalance: totals?.netBalance ?? 0,
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

      {/* Saldo Líquido Inteligente */}
      <div className={`bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between group transition-all ${
        stats.netBalance < 0 ? 'border-rose-200 hover:border-rose-300' :
        stats.netBalance > 0 ? 'border-emerald-200 hover:border-emerald-300' :
        'border-slate-200 hover:border-slate-300'
      }`}>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">
            {stats.netBalance < 0 ? 'Dívida Líquida' : stats.netBalance > 0 ? 'Crédito Líquido' : 'Saldo Zerado'}
          </p>
          <h3 className={`text-xl font-black tracking-tighter ${
            stats.netBalance < 0 ? 'text-rose-600' : stats.netBalance > 0 ? 'text-emerald-600' : 'text-slate-600'
          }`}>
            {currency(Math.abs(stats.netBalance))}
          </h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 leading-none">
            {stats.netBalance < 0 ? 'Saldo a pagar' : stats.netBalance > 0 ? 'Saldo a receber' : 'Sem pendências'}
          </p>
        </div>
        <div className={`p-3 rounded-2xl shadow-sm ${
          stats.netBalance < 0 ? 'bg-rose-50 text-rose-600' : stats.netBalance > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'
        }`}>
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
