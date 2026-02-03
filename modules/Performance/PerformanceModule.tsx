
import React, { useState, useEffect } from 'react';
import { Calendar, LayoutDashboard, Table, PieChart, Printer } from 'lucide-react';
import { performanceService } from './services/performanceService';
import { PerformanceReport } from './types';
import FinancialKPIs from './components/FinancialKPIs';
import OperationalStats from './components/OperationalStats';
import EvolutionChart from './components/EvolutionChart';
import QuantityChart from './components/QuantityChart';
import PriceTrendChart from './components/PriceTrendChart';
import CostTrendChart from './components/CostTrendChart';
import NetProfitChart from './components/NetProfitChart'; // Novo Import
import HarvestBreakdown from './components/HarvestBreakdown';
import ExpenseStructure from './components/ExpenseStructure';
import PerformancePdfModal from './components/PerformancePdfModal';
import { waitForInit } from '../../services/supabaseInitService';

const PerformanceModule: React.FC = () => {
  const [monthsBack, setMonthsBack] = useState<number | null>(6);
  const [data, setData] = useState<PerformanceReport | null>(null);
  const [isPdfOpen, setIsPdfOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await waitForInit();
      const report = performanceService.getReport(monthsBack);
      setData(report);
    };
    loadData();
  }, [monthsBack]);

  if (!data) return <div className="p-10 text-center animate-pulse text-slate-400 font-black uppercase">Calculando Indicadores...</div>;

  const periodLabel = monthsBack ? `Últimos ${monthsBack} Meses` : 'Histórico Total';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 italic uppercase">
            <LayoutDashboard className="text-primary-600" />
            Performance Analítica
          </h1>
          <p className="text-slate-500 text-sm font-medium">Cockpit de resultados operacionais e spread de mercado.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            <button 
                onClick={() => setIsPdfOpen(true)}
                className="flex items-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-5 py-2 rounded-xl hover:bg-slate-50 transition-all shadow-sm font-black text-xs uppercase tracking-widest"
            >
                <Printer size={16} /> Exportar PDF
            </button>

            <div className="flex bg-white p-1 rounded-xl border-2 border-slate-200 shadow-sm">
                {[3, 6, 9, 12].map(m => (
                    <button
                    key={m}
                    onClick={() => setMonthsBack(m)}
                    className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${
                        monthsBack === m ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                    >
                    {m} M
                    </button>
                ))}
                <button
                    onClick={() => setMonthsBack(null)}
                    className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${
                    monthsBack === null ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                >
                    Tudo
                </button>
            </div>
        </div>
      </div>

      {/* 1. KPIs Principais */}
      <FinancialKPIs 
        revenue={data.totalRevenue} 
        debits={data.totalDebits} 
        balance={data.balance} 
      />

      {/* 2. Estatísticas Operacionais */}
      <OperationalStats data={data} />

      {/* 3. NOVO: Gráfico de Lucro Líquido (Destaque Principal de Tendência) */}
      <div className="grid grid-cols-1">
          <NetProfitChart data={data.monthlyHistory} />
      </div>

      {/* 4. Gráficos de Tendência */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuantityChart data={data.monthlyHistory} />
        <PriceTrendChart data={data.priceTrendHistory} />
      </div>

      {/* 5. Gráfico de Decomposição de Custos Unitários */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <CostTrendChart data={data.monthlyHistory} />
         <EvolutionChart data={data.monthlyHistory} />
      </div>

      {/* 6. Performance por Safra/UF */}
      <HarvestBreakdown harvests={data.harvests} />

      {/* 7. Estrutura de Custos por Natureza */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <PieChart size={20} className="text-slate-400" />
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">Estrutura de Custos por Natureza</h2>
        </div>
        <ExpenseStructure data={data.expenseBreakdown} />
      </div>

      {/* 8. Histórico Mensal Detalhado */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Table size={18} className="text-slate-500" />
            <h3 className="font-bold text-slate-800">Demonstrativo Financeiro Mensal</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-white border-b border-slate-100 text-[10px] uppercase text-slate-400 font-black">
                    <tr>
                        <th className="px-6 py-3">Período</th>
                        <th className="px-6 py-3 text-right">Faturamento</th>
                        <th className="px-6 py-3 text-right text-rose-500">Custos Diretos</th>
                        <th className="px-6 py-3 text-right text-slate-500">Despesas Admin.</th>
                        <th className="px-6 py-3 text-right">Resultado Líquido</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {data.monthlyHistory.map(m => (
                        <tr key={m.fullDate} className="hover:bg-slate-50">
                            <td className="px-6 py-3 font-black text-slate-700 capitalize">{m.name} {m.fullDate.split('-')[0]}</td>
                            <td className="px-6 py-3 text-right font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.revenue)}</td>
                            <td className="px-6 py-3 text-right font-bold text-rose-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.purchaseCost + m.freightCost)}</td>
                            <td className="px-6 py-3 text-right text-slate-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.otherExpenses)}</td>
                            <td className={`px-6 py-3 text-right font-black ${m.netResult >= 0 ? 'text-blue-600' : 'text-rose-700'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.netResult)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Modal de PDF */}
      <PerformancePdfModal 
        isOpen={isPdfOpen} 
        onClose={() => setIsPdfOpen(false)} 
        data={data} 
        periodLabel={periodLabel} 
      />

    </div>
  );
};

export default PerformanceModule;
