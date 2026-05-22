import React from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Scale, FileText } from 'lucide-react';
import { useAdvancesActiveTotals } from '../../../../hooks/useAdvances';

const AdvanceKPIs: React.FC = () => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  // ✅ ZERO CÁLCULO NO FRONTEND — totais via RPC server-side
  const { data: totals } = useAdvancesActiveTotals();
  const stats = {
    takenTotal: totals?.takenRemaining ?? 0,
    givenTotal: totals?.givenRemaining ?? 0,
    countActive: totals?.countActive ?? 0,
    netBalance: totals?.netBalance ?? 0,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
      {/* Tomados (Dinheiro Entrando) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-amber-300 transition-all">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Dinheiro Entrando</p>
          <h3 className="text-xl font-black text-amber-600 tracking-tighter">{currency(stats.takenTotal)}</h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 italic leading-none">Adiantamentos Tomados</p>
        </div>
        <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 shadow-sm shadow-amber-200/50">
          <ArrowDownLeft size={20} />
        </div>
      </div>

      {/* Concedidos (Dinheiro Saindo) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-indigo-300 transition-all">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Dinheiro Saindo</p>
          <h3 className="text-xl font-black text-indigo-600 tracking-tighter">{currency(stats.givenTotal)}</h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 italic leading-none">Adiantamentos Cedidos</p>
        </div>
        <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-200/50">
          <ArrowUpRight size={20} />
        </div>
      </div>

      {/* Saldo Líquido Inteligente */}
      <div className={`bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between group transition-all ${
        stats.netBalance < 0 ? 'border-emerald-200 hover:border-emerald-300' :
        stats.netBalance > 0 ? 'border-amber-200 hover:border-amber-300' :
        'border-slate-200 hover:border-slate-300'
      }`}>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">
            {stats.netBalance < 0 ? 'Crédito c/ Parceiros' : stats.netBalance > 0 ? 'Dívida c/ Parceiros' : 'Saldo Zerado'}
          </p>
          <h3 className={`text-xl font-black tracking-tighter ${
            stats.netBalance < 0 ? 'text-emerald-600' : stats.netBalance > 0 ? 'text-amber-600' : 'text-slate-600'
          }`}>
            {currency(Math.abs(stats.netBalance))}
          </h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 leading-none">
            {stats.netBalance < 0 ? 'A descontar / favorável' : stats.netBalance > 0 ? 'A entregar / pagar' : 'Sem pendências'}
          </p>
        </div>
        <div className={`p-3 rounded-2xl shadow-sm ${
          stats.netBalance < 0 ? 'bg-emerald-50 text-emerald-600' : stats.netBalance > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'
        }`}>
          <Scale size={20} />
        </div>
      </div>

      {/* Adiantamentos Ativos */}
      <div className="bg-slate-900 p-5 rounded-3xl shadow-xl flex items-center justify-between text-white border border-slate-800 group">
        <div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Adiantamentos Ativos</p>
           <h3 className="text-xl font-black text-emerald-400 tracking-tighter">
             {stats.countActive} <span className="text-xs text-slate-400 uppercase font-bold ml-1 tracking-normal">Unidades</span>
           </h3>
           <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 leading-none">Operações vigentes</p>
        </div>
        <div className="p-3 bg-slate-800 rounded-2xl text-emerald-400 group-hover:scale-110 transition-transform shadow-lg shadow-black/40">
          <Wallet size={20} />
        </div>
      </div>
    </div>
  );
};

export default AdvanceKPIs;
