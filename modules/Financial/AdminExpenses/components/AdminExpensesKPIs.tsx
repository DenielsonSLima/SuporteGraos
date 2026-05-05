
import React from 'react';
import { DollarSign, CheckCircle2, Clock, PieChart } from 'lucide-react';

interface Props {
  total: number;
  paid: number;
  pending: number;
  fixed: number;
  administrative: number;
  variable: number;
}

const AdminExpensesKPIs: React.FC<Props> = ({ total, paid, pending, fixed, administrative, variable }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Despesas Fixas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-all">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Despesas Fixas</p>
            <h3 className="text-xl font-black text-blue-600">{currency(fixed)}</h3>
            <div className="flex items-center gap-1 mt-2 text-[9px] font-bold text-slate-500 uppercase">
              <Clock size={10} /> Recorrência Mensal
            </div>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
            <PieChart size={24} />
          </div>
        </div>

        {/* Despesas Administrativas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-slate-400 transition-all">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Administrativas</p>
            <h3 className="text-xl font-black text-slate-700">{currency(administrative)}</h3>
            <div className="flex items-center gap-1 mt-2 text-[9px] font-bold text-slate-500 uppercase">
              <PieChart size={10} /> Operação Interna
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 text-slate-600 group-hover:scale-110 transition-transform">
            <DollarSign size={24} />
          </div>
        </div>

        {/* Despesas Variáveis */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-amber-300 transition-all">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Despesas Variáveis</p>
            <h3 className="text-xl font-black text-amber-600">{currency(variable)}</h3>
            <div className="flex items-center gap-1 mt-2 text-[9px] font-bold text-slate-500 uppercase">
              <PieChart size={10} /> Fluxo Oscilante
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
            <DollarSign size={24} />
          </div>
        </div>

        {/* Total Geral */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-indigo-300 transition-all">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Comprometimento Total</p>
            <h3 className="text-xl font-black text-indigo-900">{currency(total)}</h3>
            <div className="flex items-center gap-1 mt-2 text-[9px] font-bold text-slate-500 uppercase">
              <PieChart size={10} /> Volume Consolidado
            </div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Valor Pago */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-emerald-300 transition-all">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Liquidado</p>
            <h3 className="text-xl font-black text-emerald-600">{currency(paid)}</h3>
            <div className="flex items-center gap-1 mt-2 text-[9px] font-bold text-emerald-600 uppercase">
              <CheckCircle2 size={10} /> Saídas de Caixa
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Valor em Aberto */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-rose-300 transition-all">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo em Aberto</p>
            <h3 className="text-xl font-black text-rose-600">{currency(pending)}</h3>
            <div className="flex items-center gap-1 mt-2 text-[9px] font-bold text-rose-600 uppercase">
              <Clock size={10} /> Títulos Pendentes
            </div>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform">
            <Clock size={24} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminExpensesKPIs;
