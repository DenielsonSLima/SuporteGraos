
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MonthlyData } from '../types';
import { formatMoney } from '../../../utils/formatters';

const CostTrendChart: React.FC<{ data: MonthlyData[] }> = ({ data }) => {

  const filteredData = data.filter(d => d.totalQuantitySc > 0);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
        <div className="w-1 h-4 bg-rose-500 rounded-full"></div>
        Decomposição de Custos Unitários (R$ por Saca)
      </h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
              formatter={(value: number) => [formatMoney(value), '']}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />

            <Line type="monotone" dataKey="avgPurchaseCostSc" name="Compra do Grão" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
            <Line type="monotone" dataKey="avgFreightCostSc" name="Custo Frete" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
            <Line type="monotone" dataKey="avgOtherCostSc" name="Despesas Adm/SC" stroke="#64748b" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
            <Line type="monotone" dataKey="avgTotalCostSc" name="CUSTO TOTAL MÉDIO" stroke="#1e293b" strokeWidth={4} dot={{ r: 4, fill: '#1e293b', strokeWidth: 2, stroke: '#fff' }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default React.memo(CostTrendChart);
