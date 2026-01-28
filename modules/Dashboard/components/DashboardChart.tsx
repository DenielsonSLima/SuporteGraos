
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
import { BarChart3 } from 'lucide-react';
import { formatCurrency, formatMoney } from '../../../utils/formatters';

interface ChartData {
  name: string;
  revenue: number;
  expense: number;
  avgPurchasePrice: number;
  avgSalesPrice: number;
}

interface Props {
  data: ChartData[];
}

// ⚡ OTIMIZADO: React.memo previne re-renders desnecessários
const DashboardChart: React.FC<Props> = React.memo(({ data }) => {
  // ⚡ Altura fixa para evitar re-renders em resize de janela
  const CHART_HEIGHT = 288;

  // ⚡ Memoizar configurações do Tooltip
  const tooltipFormatter = useMemo(() => {
    return (value: number, name: string) => {
      if (name === 'Receita' || name === 'Despesa') return [formatCurrency(value), name];
      return [formatMoney(value), name];
    };
  }, []);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 size={20} className="text-indigo-500" />
          Resultado & Spread (Últimos 3 Meses)
        </h3>
        <div className="flex gap-4 text-xs font-medium text-slate-500">
           <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Receita</span>
           <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Despesa</span>
           <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Preço Venda</span>
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
            
            {/* Eixo Esquerdo: Valores Totais (Barras) */}
            <YAxis 
              yAxisId="left"
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#94a3b8', fontSize: 10}} 
              tickFormatter={(val) => `R$${val/1000}k`}
            />

            {/* Eixo Direito: Preços Unitários (Linhas) */}
            <YAxis 
              yAxisId="right"
              orientation="right"
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#94a3b8', fontSize: 10}} 
              domain={[0, 'auto']}
              tickFormatter={(val) => `R$${val}`}
            />

            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
              formatter={tooltipFormatter}
            />
            
            <Bar yAxisId="left" dataKey="revenue" name="Receita" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
            <Bar yAxisId="left" dataKey="expense" name="Despesa" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={40} />
            
            <Line yAxisId="right" type="monotone" dataKey="avgSalesPrice" name="Preço Venda (SC)" stroke="#10b981" strokeWidth={3} dot={{r: 4}} />
            <Line yAxisId="right" type="monotone" dataKey="avgPurchasePrice" name="Preço Compra (SC)" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default DashboardChart;
