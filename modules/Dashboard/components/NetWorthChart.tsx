
import React, { useMemo } from 'react';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';

interface NetWorthData {
  name: string;
  netWorth: number;
  assets: number;
  liabilities: number;
  monthlyChange: number;
}

interface Props {
  data: NetWorthData[];
  growthPercent: number;
}

const NetWorthChart: React.FC<Props> = React.memo(({ data, growthPercent }) => {
  const CHART_HEIGHT = 300;

  const tooltipFormatter = useMemo(() => {
    return (value: number, name: string) => {
      const labels: Record<string, string> = {
        netWorth: 'Patrimônio Líquido',
        assets: 'Ativos',
        liabilities: 'Passivos'
      };
      return [formatCurrency(value), labels[name] || name];
    };
  }, []);

  // Custom Tooltip com variação mensal
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-xl">
          <p className="font-bold text-slate-700 mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600">Ativos:</span>
              <span className="font-bold text-emerald-700">{formatCurrency(data.assets)}</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              <span className="text-slate-600">Passivos:</span>
              <span className="font-bold text-rose-700">{formatCurrency(data.liabilities)}</span>
            </p>
            <p className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
              <span className="text-slate-600">Patrimônio:</span>
              <span className="font-bold text-purple-700">{formatCurrency(data.netWorth)}</span>
            </p>
            {data.monthlyChange !== 0 && (
              <p className={`text-xs font-bold pt-1 ${data.monthlyChange > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {data.monthlyChange > 0 ? '+' : ''}{data.monthlyChange.toFixed(1)}% vs mês anterior
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const isPositiveGrowth = growthPercent >= 0;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp size={20} className="text-purple-500" />
            Evolução Patrimonial (Últimos 6 Meses)
          </h3>
          <p className="text-xs text-slate-500 mt-1">Ativos - Passivos = Patrimônio Líquido</p>
        </div>
        
        {/* Badge de Crescimento */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm ${
          isPositiveGrowth 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {isPositiveGrowth ? (
            <TrendingUp size={18} />
          ) : (
            <TrendingDown size={18} />
          )}
          <span>
            {isPositiveGrowth ? '+' : ''}{growthPercent.toFixed(1)}%
          </span>
          <span className="text-xs font-medium opacity-70">no período</span>
        </div>
      </div>
      
      <div style={{ height: CHART_HEIGHT, width: '100%' }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#64748b', fontSize: 12, fontWeight: 'bold'}} 
              dy={10} 
            />
            
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#94a3b8', fontSize: 10}} 
              tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`}
            />

            <Tooltip 
              content={<CustomTooltip />}
            />
            
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
            
            {/* Barras: Ativos e Passivos */}
            <Bar dataKey="assets" name="Ativos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
            <Bar dataKey="liabilities" name="Passivos" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={30} />
            
            {/* Linha: Patrimônio Líquido */}
            <Line 
              type="monotone" 
              dataKey="netWorth" 
              name="Patrimônio Líquido" 
              stroke="#8b5cf6" 
              strokeWidth={3} 
              dot={{r: 5, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff'}} 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default NetWorthChart;
