
import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { PriceTrendData } from '../types';
import { formatMoney } from '../../../utils/formatters';

interface Props {
  data: PriceTrendData[];
}

const PriceTrendChart: React.FC<Props> = ({ data }) => {
  const filteredData = data.filter(d => d.avgPurchasePrice > 0 || d.avgSalesPrice > 0);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-start mb-6">
        <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
          <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
          Tendência de Preços & Spread (R$/SC)
        </h3>
      </div>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} domain={['auto', 'auto']} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
              formatter={(value: number) => [formatMoney(value), '']}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            
            <Line 
              type="monotone" 
              dataKey="avgSalesPrice" 
              name="Média Venda" 
              stroke="#10b981" 
              strokeWidth={4} 
              dot={{r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}} 
              activeDot={{r: 6}} 
              isAnimationActive={false}
            />
            
            <Line 
              type="monotone" 
              dataKey="avgPurchasePrice" 
              name="Média Compra" 
              stroke="#ef4444" 
              strokeWidth={4} 
              dot={{r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff'}} 
              activeDot={{r: 6}}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PriceTrendChart;
