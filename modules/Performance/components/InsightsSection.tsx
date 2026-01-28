
import React from 'react';
import { ArrowUpRight, ArrowDownRight, Calendar, AlertCircle, Award } from 'lucide-react';
import { PerformanceReport } from '../types';

interface Props {
  data: PerformanceReport;
}

const InsightsSection: React.FC<Props> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const OrderCard = ({ order, type }: any) => (
    <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
      <div>
        <p className="text-xs font-bold text-slate-500">#{order.orderNumber}</p>
        <p className="text-sm font-medium text-slate-800 line-clamp-1">{order.partnerName}</p>
      </div>
      <div className="text-right">
        <p className={`font-bold ${type === 'profit' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {type === 'profit' ? '+' : ''}{currency(order.profit)}
        </p>
        <p className="text-[10px] text-slate-400">{order.margin.toFixed(1)}% Margem</p>
      </div>
    </div>
  );

  const MonthCard = ({ month, type }: any) => (
    <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-2">
        <Calendar size={14} className="text-slate-400" />
        <p className="font-bold text-slate-700">{month.name}</p>
      </div>
      <p className={`font-bold ${type === 'profit' ? 'text-emerald-600' : 'text-rose-600'}`}>
        {currency(month.netResult)}
      </p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      {/* Top Lucro Pedidos */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-emerald-700">
          <Award size={20} />
          <h4 className="font-bold uppercase text-xs">Top 3 Pedidos (Lucro)</h4>
        </div>
        <div className="space-y-2">
          {data.topProfitOrders.map(o => <OrderCard key={o.id} order={o} type="profit" />)}
          {data.topProfitOrders.length === 0 && <p className="text-xs text-slate-400">Sem dados.</p>}
        </div>
      </div>

      {/* Top Prejuízo Pedidos */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-rose-700">
          <AlertCircle size={20} />
          <h4 className="font-bold uppercase text-xs">Top 3 Pedidos (Prejuízo)</h4>
        </div>
        <div className="space-y-2">
          {data.topLossOrders.map(o => <OrderCard key={o.id} order={o} type="loss" />)}
          {data.topLossOrders.length === 0 && <p className="text-xs text-slate-400">Sem dados.</p>}
        </div>
      </div>

      {/* Melhores Meses */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-emerald-700">
          <ArrowUpRight size={20} />
          <h4 className="font-bold uppercase text-xs">Melhores Meses (Saldo)</h4>
        </div>
        <div className="space-y-2">
          {data.bestMonths.map(m => <MonthCard key={m.fullDate} month={m} type="profit" />)}
        </div>
      </div>

      {/* Piores Meses */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-rose-700">
          <ArrowDownRight size={20} />
          <h4 className="font-bold uppercase text-xs">Piores Meses (Saldo)</h4>
        </div>
        <div className="space-y-2">
          {data.worstMonths.map(m => <MonthCard key={m.fullDate} month={m} type="loss" />)}
        </div>
      </div>

    </div>
  );
};

export default InsightsSection;
