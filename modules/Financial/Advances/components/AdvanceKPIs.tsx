import React from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Scale } from 'lucide-react';
import { useAdvancesActiveTotals } from '../../../../hooks/useAdvances';

interface AdvanceKPIsProps {
  searchTerm: string;
  activeSubTab: string;
}

const AdvanceKPIs: React.FC<AdvanceKPIsProps> = ({ searchTerm, activeSubTab }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  const isHistory = activeSubTab === 'history';
  const statusFilter = isHistory ? 'history' : 'active';

  // ✅ ZERO CÁLCULO NO FRONTEND — todos os cálculos e filtros no Supabase via RPC
  const { data: totals } = useAdvancesActiveTotals(searchTerm, statusFilter);

  const stats = {
    takenOriginal: totals?.takenOriginal ?? 0,
    takenSettled: totals?.takenSettled ?? 0,
    takenRemaining: totals?.takenRemaining ?? 0,
    givenOriginal: totals?.givenOriginal ?? 0,
    givenSettled: totals?.givenSettled ?? 0,
    givenRemaining: totals?.givenRemaining ?? 0,
    countActive: totals?.countActive ?? 0,
    netBalance: totals?.netBalance ?? 0,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
      {/* Tomados (Dinheiro Entrando) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-amber-300 transition-all">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Dinheiro Entrando</p>
          <h3 className="text-xl font-black text-amber-600 tracking-tighter">{currency(stats.takenRemaining)}</h3>
          <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 flex flex-col gap-0.5 leading-none">
            <div>{isHistory ? 'Saldo liquidado' : 'Adiantamentos Tomados'}</div>
            <div className="text-slate-500 font-black">
              Total: {currency(stats.takenOriginal)} | Baixado: {currency(stats.takenSettled)}
            </div>
          </div>
        </div>
        <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 shadow-sm shadow-amber-200/50">
          <ArrowDownLeft size={20} />
        </div>
      </div>

      {/* Concedidos (Dinheiro Saindo) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-indigo-300 transition-all">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Dinheiro Saindo</p>
          <h3 className="text-xl font-black text-indigo-600 tracking-tighter">{currency(stats.givenRemaining)}</h3>
          <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 flex flex-col gap-0.5 leading-none">
            <div>{isHistory ? 'Saldo liquidado' : 'Adiantamentos Cedidos'}</div>
            <div className="text-slate-500 font-black">
              Total: {currency(stats.givenOriginal)} | Baixado: {currency(stats.givenSettled)}
            </div>
          </div>
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

      {/* Adiantamentos Ativos / Histórico */}
      <div className="bg-slate-900 p-5 rounded-3xl shadow-xl flex items-center justify-between text-white border border-slate-800 group">
        <div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">
             {isHistory ? 'Histórico Geral' : 'Adiantamentos Ativos'}
           </p>
           <h3 className="text-xl font-black text-emerald-400 tracking-tighter">
             {stats.countActive} <span className="text-xs text-slate-400 uppercase font-bold ml-1 tracking-normal">Unidades</span>
           </h3>
           <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 leading-none">
             {isHistory ? 'Operações registradas' : 'Operações vigentes'}
           </p>
        </div>
        <div className="p-3 bg-slate-800 rounded-2xl text-emerald-400 group-hover:scale-110 transition-transform shadow-lg shadow-black/40">
          <Wallet size={20} />
        </div>
      </div>
    </div>
  );
};

export default AdvanceKPIs;
