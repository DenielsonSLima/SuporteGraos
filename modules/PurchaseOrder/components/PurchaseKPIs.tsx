
import React, { useMemo } from 'react';
import { DollarSign, Truck, Clock, CheckCircle2, Scale } from 'lucide-react';
import { PurchaseOrder } from '../types';
import { kpiService } from '../../../services/purchase/kpiService';
import { formatMoney } from '../../../utils/formatters';

interface Props {
  orders: PurchaseOrder[];
  /** Romaneios reativos — fornecidos pelo hook useLoadings() no módulo pai */
  loadings?: any[];
}

const PurchaseKPIs: React.FC<Props> = React.memo(({ orders, loadings: externalLoadings }) => {
  
  const stats = useMemo(() => {
    return kpiService.calculateGlobalPurchaseKPIs(orders, externalLoadings);
  }, [orders, externalLoadings]);

  const StatCard = ({ label, value, icon: Icon, color, subtext, bgClass }: any) => (
    <div className={`p-6 rounded-3xl border shadow-sm flex items-start justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${bgClass || 'bg-white border-slate-200'}`}>
      <div className="flex-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none not-italic">{label}</p>
        <h3 className="text-xl font-black text-slate-800 tracking-tighter leading-none">{formatMoney(value)}</h3>
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
        label="Total Comprado (Contratos)" 
        value={stats.totalContractValue} 
        icon={DollarSign} 
        color="bg-slate-700"
        subtext={`${stats.count} pedidos listados`}
      />
      <StatCard 
        label="Valor Total Pago" 
        value={stats.totalSettled} 
        icon={CheckCircle2} 
        color="bg-emerald-500"
        subtext="Liquidado aos Fornecedores"
      />
      <StatCard 
        label="Valor Pendente (Dívida)" 
        value={stats.totalPendingPayment} 
        icon={Clock} 
        color="bg-rose-600"
        subtext="Sobre Carga Retirada"
        bgClass="bg-white border-rose-100"
      />
      <StatCard 
        label="Mercadoria em Trânsito" 
        value={stats.totalInTransitValue} 
        icon={Truck} 
        color="bg-blue-600"
        subtext="Valor em transporte"
        bgClass="bg-blue-50 border-blue-100"
      />
    </div>
  );
});

export default PurchaseKPIs;
