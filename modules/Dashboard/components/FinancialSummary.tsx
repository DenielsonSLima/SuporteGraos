
import React from 'react';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Truck, TrendingUp } from 'lucide-react';
import { CashierReport } from '../../Cashier/types';
import { formatMoney } from '../../../utils/formatters';

interface Props {
  data: CashierReport;
}

// ⚡ OTIMIZADO: Recebe dados via props + usa formatter global (sem re-criação)
// ✅ REGRA: Frontend NÃO faz cálculos — netWorth vem pré-calculado do RPC
const FinancialSummary: React.FC<Props> = React.memo(({ data }) => {
  if (!data) return <div className="h-32 animate-pulse bg-slate-100 rounded-xl"></div>;

  // netWorth vem direto do RPC (Ativos - Passivos calculado no servidor)
  const netWorth = data.netWorth ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      
      {/* Saldo Geral */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white shadow-lg group">
        <div className="absolute right-0 top-0 h-32 w-32 -mr-8 -mt-8 rounded-full bg-emerald-500/20 blur-2xl group-hover:bg-emerald-500/30 transition-all"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-slate-800 p-2 text-emerald-400">
              <Wallet size={24} />
            </div>
            <span className="text-sm font-medium text-slate-300 uppercase tracking-wide">Saldo Disponível</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">{formatMoney(data.totalBankBalance)}</h3>
              <p className="text-[10px] text-slate-400 uppercase font-black">Disponibilidade Imediata</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contas a Pagar */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-rose-100 p-2 text-rose-600">
            <ArrowDownCircle size={24} />
          </div>
          <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">Contas a Pagar</span>
        </div>
        <h3 className="text-2xl font-bold text-slate-800 mb-1">{formatMoney(data.totalLiabilities)}</h3>
        <p className="mt-2 text-[10px] text-slate-400 uppercase font-black tracking-widest">Obrigações Operacionais</p>
      </div>

      {/* Contas a Receber */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
            <ArrowUpCircle size={24} />
          </div>
          <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">Contas a Receber</span>
        </div>
        <h3 className="text-2xl font-bold text-slate-800 mb-1">{formatMoney(data.pendingSalesReceipts)}</h3>
        <p className="mt-2 text-[10px] text-slate-400 uppercase font-black tracking-widest">Vendas Faturadas</p>
      </div>

      {/* Mercadorias em Trânsito (Novo KPI) */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow group">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-blue-100 p-2 text-blue-600 group-hover:scale-110 transition-transform">
            <Truck size={24} />
          </div>
          <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">Em Trânsito</span>
        </div>
        <h3 className="text-2xl font-bold text-blue-700 mb-1">{formatMoney(data.merchandiseInTransitValue)}</h3>
        <p className="mt-2 text-[10px] text-slate-400 uppercase font-black tracking-widest">Valor de Carga na Estrada</p>
      </div>

      {/* Patrimônio Líquido (Novo KPI) */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white shadow-lg group">
        <div className="absolute right-0 top-0 h-32 w-32 -mr-8 -mt-8 rounded-full bg-emerald-500/20 blur-2xl group-hover:bg-emerald-500/30 transition-all"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-slate-800 p-2 text-emerald-400">
              <TrendingUp size={24} />
            </div>
            <span className="text-sm font-medium text-slate-300 uppercase tracking-wide">Patrimônio Líquido</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">{formatMoney(netWorth)}</h3>
              <p className="text-[10px] text-slate-400 uppercase font-black">Ativos - Passivos</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
});

export default FinancialSummary;
