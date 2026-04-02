import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CashierReport } from '../types';

interface Props {
  data: CashierReport;
}

const CashierCharts: React.FC<Props> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);

  const incomeData = useMemo(() => [
    { name: 'Em Contas', value: data.totalBankBalance, color: '#3b82f6' },
    { name: 'Vendas a Receber', value: data.pendingSalesReceipts, color: '#10b981' },
    { name: 'Patrimônio', value: data.totalFixedAssetsValue, color: '#6366f1' },
    { name: 'Vendas de Bens', value: data.pendingAssetSalesReceipts, color: '#14b8a6' },
    { name: 'Empréstimos', value: data.loansGranted, color: '#06b6d4' },
    { name: 'Mercad. em Trânsito', value: data.merchandiseInTransitValue, color: '#f59e0b' },
    { name: 'Haveres de Sócios', value: data.shareholderReceivables, color: '#eab308' },
    { name: 'Adiant. Concedidos', value: data.advancesGiven, color: '#d97706' },
  ].filter(d => d.value > 0), [data]);

  const expenseData = useMemo(() => [
    { name: 'Fornecedores (Grãos)', value: data.pendingPurchasePayments, color: '#ef4444' },
    { name: 'Fretes a Pagar', value: data.pendingFreightPayments, color: '#f97316' },
    { name: 'Adiant. Recebidos', value: data.advancesTaken, color: '#8b5cf6' },
    { name: 'Empréstimos Tomados', value: data.loansTaken, color: '#ec4899' },
    { name: 'Comissões a Pagar', value: data.commissionsToPay, color: '#f43f5e' },
    { name: 'Obrigações com Sócios', value: data.shareholderPayables, color: '#64748b' },
  ].filter(d => d.value > 0), [data]);

  // Total de ativos vem pré-calculado do SQL — frontend NÃO recalcula
  const totalIncome = data.totalAssets;
  const totalExpense = data.totalLiabilities;

  const ChartCard = useMemo(() => React.memo(({ title, chartData, total }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-auto min-h-[450px] animate-in fade-in duration-700">
      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 text-center">{title}</h4>

      <div className="h-64 w-full relative mb-6">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={95}
              paddingAngle={4}
              dataKey="value"
              animationBegin={100}
              animationDuration={600}
            >
              {chartData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" className="hover:opacity-80 transition-opacity" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [currency(value), 'Valor']}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
            />
          </PieChart>
        </ResponsiveContainer>
        {chartData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">
            Sem movimentação para exibir
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3 px-2 overflow-y-auto max-h-[300px]">
        {chartData.map((entry: any, index: number) => {
          const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0;
          return (
            <div key={index} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2 last:border-0 hover:bg-slate-50 p-1 rounded transition-colors">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: entry.color }}></div>
                <span className="font-bold text-slate-700 truncate" title={entry.name}>{entry.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span className="text-slate-400 font-medium text-[10px]">{currency(entry.value)}</span>
                <span className="text-slate-900 font-black w-10 text-right bg-slate-100 px-1 py-0.5 rounded">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )), [currency]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <ChartCard title="Composição de Ativos & Bens" chartData={incomeData} total={totalIncome} />
      <ChartCard title="Composição de Passivos & Obrigações" chartData={expenseData} total={totalExpense} />
    </div>
  );
};

export default CashierCharts;
