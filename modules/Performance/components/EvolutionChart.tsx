
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MonthlyData } from '../types';
import { formatCurrency } from '../../../utils/formatters';

const EvolutionChart: React.FC<{ data: MonthlyData[] }> = ({ data }) => {

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
        <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
        DRE Mensal: Receita x Custos Operacionais
      </h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(val) => `R$${val / 1000}k`} />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              formatter={(value: number) => [formatCurrency(value), '']}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingTop: '20px', paddingBottom: '0px' }}
              formatter={(value) => (
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">
                  {value}
                </span>
              )}
            />

            <Bar dataKey="revenue" name="Receita Bruta" fill="#2563eb" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="purchaseCost" name="Compra de Grão" fill="#ef4444" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="freightCost" name="Custo Fretes" fill="#f59e0b" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="otherExpenses" name="Outras Despesas" fill="#64748b" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default React.memo(EvolutionChart);
