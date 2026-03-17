
import React from 'react';
import { 
  ShoppingCart, 
  CreditCard, 
  Truck, 
  Package, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  MinusCircle, 
  TrendingUp, 
  Undo2, 
  Building2,
  HandCoins,
  History
} from 'lucide-react';
import { CashierReport } from '../types';

interface Props {
  data: CashierReport;
}

const CashierSummaryCards: React.FC<Props> = ({ data }) => {
  const currency = (val: number) => {
    const value = val || 0;
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const StatItem = ({ label, value, icon: Icon, color, sub, size = "large" }: any) => (
    <div className={`p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between ${size === 'small' ? 'px-3 py-2' : ''}`}>
      <div>
        <div className={`flex items-center gap-2 mb-1.5 ${color}`}>
          <Icon size={size === 'small' ? 12 : 14} />
          <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <div className={`${size === 'small' ? 'text-sm' : 'text-lg'} font-black text-slate-800 leading-none`}>{currency(value)}</div>
      </div>
      {sub && size !== 'small' && <p className="text-[9px] text-slate-400 mt-2 font-medium italic leading-tight">{sub}</p>}
    </div>
  );

  // Fallbacks
  const credits = data.creditsReceivedDetails || { sales_order: 0, loan: 0, others: 0 };
  const totalCredits = (credits.sales_order || 0) + (credits.loan || 0) + (credits.others || 0);

  return (
    <div className="grid grid-cols-1 gap-6 mb-8">
      {/* CARD 1: FLUXO OPERACIONAL CONSOLIDADO (Refatorado) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg text-white">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-700 leading-tight">Fluxo Operacional do Mês</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Visão 360º de Entradas e Saídas</p>
            </div>
          </div>
          <div className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-black uppercase tracking-wider">Mês Atual</span>
          </div>
        </div>

        {/* Linha 1: Core de Compras e Vendas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatItem label="Valor Comprado" value={data.monthPurchasedTotal} icon={ShoppingCart} color="text-slate-500" sub="PO's registradas" />
          <StatItem label="Valor Vendido" value={data.monthSoldTotal} icon={TrendingUp} color="text-primary-600" sub="Cargas (unloaded/completed)" />
          <StatItem label="Res. Operacional" value={data.monthOperationalSpread} icon={TrendingUp} color="text-emerald-600" sub="Spread (Vendido - Comprado)" />
          
          <div className="p-4 bg-slate-900 rounded-xl flex flex-col justify-between text-white shadow-lg">
            <div>
              <div className="flex items-center gap-2 mb-2 text-slate-400">
                <MinusCircle size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">Gap Financeiro</span>
              </div>
              <div className={`text-lg font-black leading-none ${data.monthDirectDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {currency(data.monthDirectDiff)}
              </div>
            </div>
            <p className="text-[9px] text-slate-500 mt-2 font-medium italic leading-tight">Recebido - Pago</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Seção de CRÉDITOS (Entradas) */}
          <div className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-100/50">
            <div className="flex items-center gap-2 mb-4">
              <HandCoins size={16} className="text-emerald-600" />
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Créditos Recebidos:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1 text-emerald-600">
                  <Package size={10} />
                  <span className="text-[8px] font-black uppercase">Vendas</span>
                </div>
                <div className="text-xs font-black text-slate-800">{currency(credits.sales_order)}</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1 text-blue-600">
                  <Receipt size={10} />
                  <span className="text-[8px] font-black uppercase">Empréstimos</span>
                </div>
                <div className="text-xs font-black text-slate-800">{currency(credits.loan)}</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                  <ArrowUpRight size={10} />
                  <span className="text-[8px] font-black uppercase">Outros</span>
                </div>
                <div className="text-xs font-black text-slate-800">{currency(credits.others)}</div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-emerald-100 flex justify-between items-center">
              <span className="text-[9px] font-bold text-emerald-700 uppercase">Total Recebido</span>
              <span className="text-sm font-black text-emerald-600">{currency(totalCredits)}</span>
            </div>
          </div>

          {/* Seção de SAÍDAS (Pagos) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={16} className="text-slate-600" />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Detalhamento de Pagos:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1 text-slate-500">
                  <ShoppingCart size={10} />
                  <span className="text-[8px] font-black uppercase">Compras</span>
                </div>
                <div className="text-xs font-black text-slate-800">{currency(data.monthPurchasesPaidTotal)}</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1 text-orange-500">
                  <Truck size={10} />
                  <span className="text-[8px] font-black uppercase">Fretes</span>
                </div>
                <div className="text-xs font-black text-slate-800">{currency(data.monthFreightPaidTotal)}</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1 text-primary-500">
                  <Building2 size={10} />
                  <span className="text-[8px] font-black uppercase">Despesas</span>
                </div>
                <div className="text-xs font-black text-slate-800">{currency(data.monthExpensesPaidTotal)}</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1 text-rose-500">
                  <Undo2 size={10} />
                  <span className="text-[8px] font-black uppercase">Recusas</span>
                </div>
                <div className="text-xs font-black text-slate-800">{currency(data.monthRefusedTotal)}</div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="text-[9px] font-bold text-slate-500 uppercase">Total Saídas do Banco</span>
              <span className="text-sm font-black text-slate-800">{currency(data.monthPaidTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: POSIÇÃO FUTURISTA (Simplificado) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <History size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-700 leading-tight">Posição de Recebíveis</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Previsão e Realidade</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                <Calendar size={18} />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-0.5">Aberto de Meses Anteriores</span>
                <span className="text-base font-black text-slate-800">{currency(data.revenueDistribution?.opening_receivables)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-blue-400">
                <TrendingUp size={18} />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-0.5">Projeção de Meses Futuros</span>
                <span className="text-base font-black text-slate-800">{currency(data.revenueDistribution?.future_receivables)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashierSummaryCards;

