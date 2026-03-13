
import React, { useMemo } from 'react';
import { DollarSign, Truck, Scale, CheckCircle2, Clock } from 'lucide-react';
import { useLogisticsKPIs } from '../../../hooks/useLogisticsKPIs';
import type { LogisticsKPIFilters } from '../../../services/logisticsKpiService';
import type { Freight } from '../types';

interface Props {
  filters?: LogisticsKPIFilters;
  /** Fallback: freights já filtrados (sem filtro de aba) para calcular KPIs 
   *  quando a RPC rpc_logistics_kpi_totals não estiver disponível no banco. */
  freights?: Freight[];
}

/**
 * KPIs de Logística — SKIL §5.4: agregações primárias via RPC (SUM no banco).
 * Fallback: quando a RPC falha ou retorna zeros, computa a partir dos freights.
 */
const LogisticsKPIs: React.FC<Props> = ({ filters = {}, freights = [] }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(val) < 0.005 ? 0 : val);
  const number = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(val);

  const { data: stats } = useLogisticsKPIs(filters);

  // Fallback local: computa KPIs dos freights quando a RPC não retorna dados
  const localKpis = useMemo(() => {
    if (!freights.length) return null;
    return {
      totalFreightValue: freights.reduce((acc, f) => acc + f.totalFreight, 0),
      totalPaid: freights.reduce((acc, f) => acc + f.paidValue, 0),
      totalPending: freights.reduce((acc, f) => acc + f.balanceValue, 0),
      totalVolumeTon: freights.reduce((acc, f) => acc + (f.weight / 1000), 0),
      activeCount: freights.filter(f => f.status !== 'completed' && f.status !== 'canceled').length,
      count: freights.length,
    };
  }, [freights]);

  // Verifica se a RPC retornou dados válidos (não-zero)
  const rpcHasData = stats && (
    (stats.totalFreightValue ?? 0) > 0 ||
    (stats.totalPaid ?? 0) > 0 ||
    (stats.totalPending ?? 0) > 0 ||
    (stats.totalCount ?? 0) > 0
  );

  const source = rpcHasData ? stats! : localKpis;

  const kpis = {
    totalFreightValue: source?.totalFreightValue ?? 0,
    totalPaid: source?.totalPaid ?? 0,
    totalPending: source?.totalPending ?? 0,
    totalVolumeTon: source?.totalVolumeTon ?? 0,
    activeCount: source?.activeCount ?? 0,
    count: (rpcHasData ? stats?.totalCount : localKpis?.count) ?? 0,
  };

  const StatCard = ({ label, value, icon: Icon, color, subtext, bgClass }: any) => (
    <div className={`p-5 rounded-2xl border shadow-sm flex items-start justify-between hover:shadow-md transition-shadow ${bgClass || 'bg-white border-slate-200'}`}>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-xl font-black text-slate-800 tracking-tighter">{value}</h3>
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
        label="Total Fretes (Contratado)" 
        value={currency(kpis.totalFreightValue)} 
        icon={Truck} 
        color="bg-slate-700"
        subtext={`${kpis.count} cargas listadas`}
      />
      <StatCard 
        label="Total Pago" 
        value={currency(kpis.totalPaid)} 
        icon={CheckCircle2} 
        color="bg-emerald-500"
        subtext="Adiantamentos + Saldos"
      />
      <StatCard 
        label="Saldo a Pagar" 
        value={currency(kpis.totalPending)} 
        icon={Clock} 
        color="bg-rose-600"
        subtext="Pendência Financeira"
        bgClass="bg-white border-rose-100"
      />
      <StatCard 
        label="Volume Movimentado" 
        value={`${number(kpis.totalVolumeTon)} TON`} 
        icon={Scale} 
        color="bg-blue-600"
        subtext={`${kpis.activeCount} cargas em trânsito`}
        bgClass="bg-blue-50 border-blue-100"
      />
    </div>
  );
};

export default LogisticsKPIs;
