
import React, { useMemo } from 'react';
import { DollarSign, Truck, Clock, PackageCheck } from 'lucide-react';
import { SalesOrder } from '../types';
import { formatMoney } from '../../../utils/formatters';

interface Props {
  orders: SalesOrder[];
}

const SalesKPIs: React.FC<Props> = React.memo(({ orders }) => {
  
  // ═══════ Stats vindos do SQL (VIEW vw_sales_orders_enriched) ═══════
  // Zero cálculo no frontend — apenas soma valores pré-calculados pelo banco
  const stats = useMemo(() => {
    return orders.reduce((acc, o) => {
      acc.totalContractValue += o.totalValue;
      acc.totalDeliveredValue += (o.deliveredValue ?? 0);
      acc.totalReceived += (o.paidValue ?? 0);
      acc.totalTransitValue += (o.transitValue ?? 0);
      acc.transitCount += (o.transitCount ?? 0);
      acc.pendingReceipt = Math.max(0, acc.totalDeliveredValue - acc.totalReceived);
      return acc;
    }, {
      totalContractValue: 0,
      totalDeliveredValue: 0,
      totalReceived: 0,
      totalTransitValue: 0,
      transitCount: 0,
      count: orders.length,
      pendingReceipt: 0
    });
  }, [orders]);

  const StatCard = ({ label, value, icon: Icon, color, subtext, bgClass }: any) => (
    <div className={`p-5 rounded-2xl border shadow-sm flex items-start justify-between hover:shadow-md transition-shadow ${bgClass || 'bg-white border-slate-200'}`}>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-xl font-black text-slate-800 tracking-tighter">{formatMoney(value)}</h3>
        {subtext && <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 italic">{subtext}</p>}
      </div>
      <div className={`p-2.5 rounded-xl ${color} shadow-sm`}>
        <Icon size={20} className="text-white" />
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6 animate-in slide-in-from-top-4">
      <StatCard 
        label="Total em Contratos" 
        value={stats.totalContractValue} 
        icon={DollarSign} 
        color="bg-slate-700"
        subtext={`${stats.count} pedidos listados`}
      />
      <StatCard 
        label="Vendas Entregues (Faturado)" 
        value={stats.totalDeliveredValue} 
        icon={PackageCheck} 
        color="bg-emerald-500"
        subtext="Valor Real Descarregado"
      />
      <StatCard 
        label="Saldo a Receber" 
        value={stats.pendingReceipt} 
        icon={Clock} 
        color="bg-amber-500"
        subtext="Pendente sobre Entregue"
        bgClass="bg-white border-amber-100"
      />
      <StatCard 
        label="Mercadoria em Trânsito" 
        value={stats.totalTransitValue} 
        icon={Truck} 
        color="bg-blue-600"
        subtext={`${stats.transitCount} cargas a caminho`}
        bgClass="bg-blue-50 border-blue-100"
      />
    </div>
  );
});

export default SalesKPIs;
