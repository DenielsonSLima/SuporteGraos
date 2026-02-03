
import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { MonthlyData } from '../types';
import { formatCurrency } from '../../../utils/formatters';

interface Props {
  data: MonthlyData[];
}

const NetProfitChart: React.FC<Props> = ({ data }) => {
  // Custom Dot para pintar de vermelho se for prejuízo
  const CustomizedDot = (props: any) => {
    const { cx, cy, payload } = props;
    const isProfit = payload.netResult >= 0;
    
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={4} 
        stroke={isProfit ? "#10b981" : "#f43f5e"} 
        strokeWidth={2} 
        fill="#fff" 
      />
    );
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full">
      <div className="flex justify-between items-start mb-6">
        <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
          <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
          Evolução do Lucro Líquido Mensal
        </h3>
      </div>
      
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#94a3b8', fontSize: 10}} 
              dy={10} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#94a3b8', fontSize: 10}} 
              tickFormatter={(val) => `R$${val/1000}k`}
            />
            <Tooltip 
              cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
              formatter={(value: number) => [
                <span className={value >= 0 ? "text-emerald-600" : "text-rose-600"}>{formatCurrency(value)}</span>, 
                'Resultado'
              ]}
            />
            
            {/* Linha de Referência do Zero (Break-even) */}
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />

            <Line 
              type="monotone" 
              dataKey="netResult" 
              name="Resultado" 
              stroke="#0f172a" 
              strokeWidth={3}
              dot={<CustomizedDot />}
              activeDot={{r: 6, fill: '#0f172a'}} 
              isAnimationActive={true}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default NetProfitChart;
