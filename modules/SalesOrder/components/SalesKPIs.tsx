
import React, { useMemo } from 'react';
import { DollarSign, Truck, Clock, PackageCheck } from 'lucide-react';
import { SalesOrder } from '../types';
import { formatCurrency } from '../../../utils/formatters';
import { kpiService } from '../../../services/sales/kpiService';

interface Props {
  orders: SalesOrder[];
}

const SalesKPIs: React.FC<Props> = React.memo(({ orders }) => {
  const stats = useMemo(() => kpiService.calculateGlobalSalesKPIs(orders), [orders]);

  const StatCard = ({ label, value, icon: Icon, color, subtext, bgClass }: any) => (
    <div className={`p-6 rounded-3xl border shadow-sm flex items-start justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${bgClass || 'bg-white border-slate-200'}`}>
      <div className="flex-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none not-italic">{label}</p>
        <h3 className="text-xl font-black text-slate-800 tracking-tighter leading-none">{formatCurrency(value)}</h3>
        {subtext && <p className="text-[9px] text-slate-500 font-black uppercase mt-2 tracking-tight">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-2xl ${color} shadow-lg shadow-current/20 shrink-0 ml-4`}>
        <Icon size={22} className="text-white" />
      </div>
    </div>
  );

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
      <StatCard 
        label="Faturamento Contratado" 
        value={stats.totalContractValue} 
        icon={DollarSign} 
        color="bg-slate-800"
        subtext={`${stats.count} Contratos Ativos`}
      />
      <StatCard 
        label="Vendas Realizadas" 
        value={stats.totalDeliveredValue} 
        icon={PackageCheck} 
        color="bg-emerald-600"
        subtext="Total Descarregado (Real)"
      />
      <StatCard 
        label="Saldo Pendente" 
        value={stats.pendingReceipt} 
        icon={Clock} 
        color="bg-amber-500"
        subtext="A Receber sobre Entregue"
        bgClass="bg-white border-amber-100"
      />
      <StatCard 
        label="Carga em Transito" 
        value={stats.totalTransitValue} 
        icon={Truck} 
        color="bg-blue-600"
        subtext={`${stats.transitCount} Caminhões na Estrada`}
        bgClass="bg-blue-50/50 border-blue-100"
      />
    </div>
  );
});

export default SalesKPIs;

