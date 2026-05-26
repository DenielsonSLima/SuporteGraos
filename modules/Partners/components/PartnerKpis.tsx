import React from 'react';
import { ArrowUpRight, ArrowDownRight, Scale } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';

interface Props {
  totalReceivable: number;
  totalPayable: number;
  netBalance: number;
}

const PartnerKpis: React.FC<Props> = ({ totalReceivable, totalPayable, netBalance }) => {
  return (
    <div className="grid gap-6 md:grid-cols-3 mb-6 animate-in fade-in duration-300">
      {/* Total Geral a Receber */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Geral a Receber</p>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">{formatMoney(totalReceivable)}</h3>
        </div>
        <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shadow-sm shadow-emerald-100">
          <ArrowUpRight size={20} className="stroke-[3]" />
        </div>
      </div>

      {/* Total Geral a Pagar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Geral a Pagar</p>
          <h3 className="text-2xl font-black text-rose-600 mt-1">{formatMoney(totalPayable)}</h3>
        </div>
        <div className="p-3 bg-rose-50 rounded-xl text-rose-600 shadow-sm shadow-rose-100">
          <ArrowDownRight size={20} className="stroke-[3]" />
        </div>
      </div>

      {/* Saldo Líquido da Base */}
      <div className="bg-slate-900 p-6 rounded-2xl shadow-md flex items-center justify-between text-white hover:bg-slate-950 transition-all">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Líquido da Base</p>
          <h3 className={`text-2xl font-black mt-1 ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatMoney(netBalance)}
          </h3>
        </div>
        <div className="p-3 bg-slate-800 rounded-xl text-slate-300 shadow-sm shadow-slate-950">
          <Scale size={20} className="stroke-[2.5]" />
        </div>
      </div>
    </div>
  );
};

export default PartnerKpis;
