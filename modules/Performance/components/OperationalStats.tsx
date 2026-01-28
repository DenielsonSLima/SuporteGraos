import React from 'react';
import { Scale, Package, DollarSign, Truck, Briefcase, TrendingUp, Percent, Calculator, Building2, Layers, ArrowRightLeft } from 'lucide-react';
import { PerformanceReport } from '../types';

interface Props {
  data: PerformanceReport;
}

const OperationalStats: React.FC<Props> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const number = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(val);

  const StatItem = ({ label, value, sub, icon: Icon, color }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all hover:-translate-y-1">
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{label}</span>
        <div className={`p-2 rounded-lg ${color.replace('text-', 'bg-').replace('600', '100').replace('700', '100').replace('800', '100').replace('950', '100').replace('rose', 'rose-100')}`}>
          <Icon size={18} className={color} />
        </div>
      </div>
      <div>
        <span className="text-xl font-black text-slate-900 leading-none">{value}</span>
        {sub && <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-tighter line-clamp-1">{sub}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 mb-8">
      {/* Linha 1: Volume e Preços de Mercado */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatItem label="Volume (Ton)" value={number(data.totalVolumeTon)} sub="Peso Real Consolidado" icon={Scale} color="text-blue-600" />
        <StatItem label="Volume (SC)" value={number(data.totalVolumeSc)} sub="Sacas 60kg Operadas" icon={Package} color="text-indigo-600" />
        <StatItem label="Média Venda" value={currency(data.avgSalesPrice)} sub="Receita por Saca" icon={DollarSign} color="text-emerald-600" />
        <StatItem label="Média Compra" value={currency(data.avgPurchasePrice)} sub="Custo Grão por Saca" icon={DollarSign} color="text-rose-600" />
        <StatItem label="Gastos com Recusa" value={currency(data.totalRedirectCosts)} sub="Custo Extra Redirecionamento" icon={ArrowRightLeft} color="text-rose-700" />
      </div>

      {/* Linha 2: Custos e Lucratividade */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatItem label="Frete Médio (T)" value={currency(data.avgFreightPriceTon)} sub="Logística por Tonelada" icon={Truck} color="text-blue-700" />
        <StatItem label="Frete (R$/SC)" value={currency(data.avgFreightCostSc)} sub="Logística por Saca" icon={Truck} color="text-indigo-700" />
        <StatItem label="Estrutura (R$/SC)" value={currency(data.avgPureOpCostSc)} sub="ADM/Fixo (Sem Grão/Frete)" icon={Building2} color="text-slate-600" />
        <StatItem label="Lucro Líq. (SC)" value={currency(data.avgProfitPerSc)} sub="Sobra Real Final" icon={TrendingUp} color="text-emerald-700" />
        <StatItem label="Margem Geral" value={`${data.globalMarginPercent.toFixed(1)}%`} sub="Eficiência de Lucro" icon={Percent} color="text-slate-950" />
      </div>
    </div>
  );
};

export default OperationalStats;