
import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  ShoppingCart, 
  Truck, 
  DollarSign, 
  Package,
  Activity
} from 'lucide-react';

interface KPIProps {
  data: {
    ordersLast30Days: number;
    volumeSc: number;
    volumeTon: number;
    avgPurchasePrice: number;
    avgSalesPrice: number;
    avgFreightPriceTon: number;
    avgCostPerSc: number;
    avgProfitPerSc: number;
  };
}

const OperationalSummary: React.FC<KPIProps> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const number = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(val);

  const KpiCard = ({ label, value, subValue, icon: Icon, color, trend }: any) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        {trend && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <h3 className="text-xl font-bold text-slate-800">{value}</h3>
        {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 mb-8">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <Activity size={20} className="text-slate-500" />
        Indicadores Operacionais (30 Dias)
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <KpiCard 
          label="Volume Movimentado"
          value={`${number(data.volumeSc)} SC`}
          subValue={`${number(data.volumeTon)} Toneladas`}
          icon={Scale}
          color="bg-blue-500"
        />

        <KpiCard 
          label="Pedidos Recentes"
          value={data.ordersLast30Days}
          subValue="Compras e Vendas"
          icon={ShoppingCart}
          color="bg-indigo-500"
        />

        <KpiCard 
          label="Custo Médio / SC"
          value={currency(data.avgCostPerSc)}
          subValue="Inclui Frete e Despesas"
          icon={TrendingDown}
          color="bg-rose-500"
        />

        <KpiCard 
          label="Lucro Estimado / SC"
          value={currency(data.avgProfitPerSc)}
          subValue="Margem Bruta Média"
          icon={TrendingUp}
          color={data.avgProfitPerSc >= 0 ? "bg-emerald-500" : "bg-red-500"}
        />

        <KpiCard 
          label="Preço Médio Compra"
          value={currency(data.avgPurchasePrice)}
          subValue="Por Saca"
          icon={Package}
          color="bg-slate-600"
        />

        <KpiCard 
          label="Preço Médio Venda"
          value={currency(data.avgSalesPrice)}
          subValue="Por Saca"
          icon={DollarSign}
          color="bg-emerald-600"
        />

        <KpiCard 
          label="Média Frete (Ton)"
          value={currency(data.avgFreightPriceTon)}
          subValue="Custo Logístico"
          icon={Truck}
          color="bg-amber-500"
        />

      </div>
    </div>
  );
};

export default OperationalSummary;
