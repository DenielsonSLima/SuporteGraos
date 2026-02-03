
import React from 'react';
import { Wallet, TrendingUp, TrendingDown, Scale, PieChart, Coins } from 'lucide-react';
import { CashierReport } from '../types';

interface Props {
  data: CashierReport;
}

const CashierKPIs: React.FC<Props> = ({ data }) => {
  const currency = (val: number) => {
    // Ignora o sinal de negativo se o valor for próximo de zero
    const cleanValue = Math.abs(val) < 0.01 ? 0 : val;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cleanValue);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
      
      {/* Saldo Líquido (Destaque) */}
      <div className="bg-slate-950 text-white p-5 rounded-2xl shadow-xl relative overflow-hidden group border border-slate-800">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
          <Scale size={80} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <PieChart size={14} className="text-emerald-400" />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">Patrimônio Líquido</span>
          </div>
          <h3 className={`text-xl font-black tracking-tighter ${data.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {currency(data.netBalance)}
          </h3>
          <p className="text-[9px] text-slate-500 mt-2 font-bold uppercase leading-none">Sobra Real Projetada</p>
        </div>
      </div>

      {/* Disponibilidade Imediata */}
      <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden group">
        <div className="absolute right-0 top-0 p-4 text-blue-50 group-hover:text-blue-100 transition-colors">
          <Wallet size={32} />
        </div>
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disponibilidade</span>
          <h3 className="text-lg font-black text-blue-700 mt-1 tracking-tight">
            {currency(data.totalBankBalance)}
          </h3>
          <p className="text-[10px] text-blue-600/70 mt-2 font-black uppercase">
            Saldos Atuais em Banco
          </p>
        </div>
      </div>

      {/* Total Ativos */}
      <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden group">
        <div className="absolute right-0 top-0 p-4 text-emerald-50 group-hover:text-emerald-100 transition-colors">
          <TrendingUp size={32} />
        </div>
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Ativos</span>
          <h3 className="text-lg font-black text-emerald-700 mt-1 tracking-tight">{currency(data.totalAssets)}</h3>
          <p className="text-[10px] text-emerald-600/70 mt-2 font-black uppercase">
            Receitas + Patrimônio
          </p>
        </div>
      </div>

      {/* Total Débitos */}
      <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm relative overflow-hidden group">
        <div className="absolute right-0 top-0 p-4 text-rose-50 group-hover:text-rose-100 transition-colors">
          <TrendingDown size={32} />
        </div>
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Passivos</span>
          <h3 className="text-lg font-black text-rose-700 mt-1 tracking-tight">{currency(data.totalLiabilities)}</h3>
          <p className="text-[10px] text-rose-600/70 mt-2 font-black uppercase">
            Dívidas e Obrigações
          </p>
        </div>
      </div>

      {/* Saldo Inicial Implantação */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="absolute right-0 top-0 p-4 text-slate-100 group-hover:text-slate-200 transition-colors">
          <Coins size={32} />
        </div>
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Inicial Impl.</span>
          <h3 className="text-lg font-black text-slate-800 mt-1 tracking-tight">
            {currency(data.totalInitialBalance)}
          </h3>
          <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase italic">
            Aporte do Sistema
          </p>
        </div>
      </div>

    </div>
  );
};

export default CashierKPIs;
