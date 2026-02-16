
import React, { useMemo } from 'react';
import { DollarSign, Truck, Scale, CheckCircle2, Clock } from 'lucide-react';
import { Freight } from '../types';

interface Props {
  freights: Freight[];
}

const LogisticsKPIs: React.FC<Props> = ({ freights }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const number = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(val);

  const stats = useMemo(() => {
    // 1. Valor Total de Fretes (Contratado na lista atual)
    const totalFreightValue = freights.reduce((acc, f) => acc + f.totalFreight, 0);

    // 2. Valor Pago (Adiantamentos + Saldos Quitados na lista atual)
    const totalPaid = freights.reduce((acc, f) => acc + f.paidValue, 0);

    // 3. Saldo Pendente (Obrigações na lista atual)
    const totalPending = freights.reduce((acc, f) => acc + f.balanceValue, 0);

    // 4. Volume Total (Toneladas na lista atual)
    const totalVolumeTon = freights.reduce((acc, f) => acc + (f.weight / 1000), 0);

    // 5. Contagem de Cargas Ativas (Não concluídas/canceladas na lista atual)
    const activeCount = freights.filter(f => f.status !== 'completed' && f.status !== 'canceled').length;

    return {
      totalFreightValue,
      totalPaid,
      totalPending,
      totalVolumeTon,
      activeCount,
      count: freights.length
    };
  }, [freights]);

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
        value={currency(stats.totalFreightValue)} 
        icon={Truck} 
        color="bg-slate-700"
        subtext={`${stats.count} cargas listadas`}
      />
      <StatCard 
        label="Total Pago" 
        value={currency(stats.totalPaid)} 
        icon={CheckCircle2} 
        color="bg-emerald-500"
        subtext="Adiantamentos + Saldos"
      />
      <StatCard 
        label="Saldo a Pagar" 
        value={currency(stats.totalPending)} 
        icon={Clock} 
        color="bg-rose-600"
        subtext="Pendência Financeira"
        bgClass="bg-white border-rose-100"
      />
      <StatCard 
        label="Volume Movimentado" 
        value={`${number(stats.totalVolumeTon)} TON`} 
        icon={Scale} 
        color="bg-blue-600"
        subtext={`${stats.activeCount} cargas em trânsito`}
        bgClass="bg-blue-50 border-blue-100"
      />
    </div>
  );
};

export default LogisticsKPIs;
