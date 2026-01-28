
import React from 'react';
import { Landmark, ArrowUpRight, ArrowDownLeft, Scale } from 'lucide-react';
import { LoanRecord } from '../../types';

interface Props {
  loans: LoanRecord[];
}

const LoanKPIs: React.FC<Props> = ({ loans }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const stats = {
    takenTotal: loans.filter(l => l.type === 'taken' && l.status === 'active').reduce((acc, l) => acc + l.remainingValue, 0),
    grantedTotal: loans.filter(l => l.type === 'granted' && l.status === 'active').reduce((acc, l) => acc + l.remainingValue, 0),
    countActive: loans.filter(l => l.status === 'active').length
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Tomados */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-rose-300 transition-all">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dívidas (Tomados)</p>
          <h3 className="text-2xl font-black text-rose-600">{currency(stats.takenTotal)}</h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 italic">Saldo devedor com terceiros</p>
        </div>
        <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
          <ArrowDownLeft size={24} />
        </div>
      </div>

      {/* Concedidos */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-emerald-300 transition-all">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Créditos (Concedidos)</p>
          <h3 className="text-2xl font-black text-emerald-600">{currency(stats.grantedTotal)}</h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 italic">Saldo a receber de terceiros</p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
          <ArrowUpRight size={24} />
        </div>
      </div>

      {/* Saldo Líquido */}
      <div className="bg-slate-900 p-6 rounded-2xl shadow-xl flex items-center justify-between text-white border border-slate-800 group">
        <div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Líquido Real</p>
           <h3 className={`text-2xl font-black ${stats.grantedTotal - stats.takenTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
             {currency(stats.grantedTotal - stats.takenTotal)}
           </h3>
           <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">{stats.countActive} contratos vigentes</p>
        </div>
        <div className="p-3 bg-slate-800 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
          <Scale size={24} />
        </div>
      </div>
    </div>
  );
};

export default LoanKPIs;
