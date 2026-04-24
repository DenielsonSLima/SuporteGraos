import React from 'react';
import { DollarSign, Truck, Clock, PackageCheck } from 'lucide-react';
import { useSalesStats } from '../../../hooks/useSalesStats';
import { formatCurrency } from '../../../utils/formatters';

const SalesKPIs: React.FC = React.memo(() => {
  const { data: stats, isLoading } = useSalesStats();

  const StatCard = ({ label, value, icon: Icon, color, subtext, bgClass, loading }: any) => (
    <div className={`p-6 rounded-3xl border shadow-sm flex items-start justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${bgClass || 'bg-white border-slate-200'}`}>
      <div className="flex-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none not-italic">{label}</p>
        {loading ? (
          <div className="h-6 w-24 bg-slate-100 animate-pulse rounded" />
        ) : (
          <h3 className="text-xl font-black text-slate-800 tracking-tighter leading-none">{formatCurrency(value)}</h3>
        )}
        {subtext && <p className="text-[9px] text-slate-500 font-black uppercase mt-2 tracking-tight">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-2xl ${color} shadow-lg shadow-current/20 shrink-0 ml-4`}>
        <Icon size={22} className="text-white" />
      </div>
    </div>
  );

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
      <StatCard 
        label="Faturamento Contratado" 
        value={stats?.totalContractValue || 0} 
        icon={DollarSign} 
        color="bg-slate-800"
        subtext={`${stats?.count || 0} Contratos Ativos`}
        loading={isLoading}
      />
      <StatCard 
        label="Vendas Realizadas" 
        value={stats?.totalDeliveredValue || 0} 
        icon={PackageCheck} 
        color="bg-emerald-600"
        subtext="Total Descarregado (Real)"
        loading={isLoading}
      />
      <StatCard 
        label="Saldo Pendente" 
        value={stats?.pendingReceipt || 0} 
        icon={Clock} 
        color="bg-amber-500"
        subtext="A Receber sobre Entregue"
        bgClass="bg-white border-amber-100"
        loading={isLoading}
      />
      <StatCard 
        label="Carga em Transito" 
        value={stats?.totalTransitValue || 0} 
        icon={Truck} 
        color="bg-blue-600"
        subtext={`${stats?.transitCount || 0} Caminhões na Estrada`}
        bgClass="bg-blue-50/50 border-blue-100"
        loading={isLoading}
      />
    </div>
  );
});

export default SalesKPIs;

