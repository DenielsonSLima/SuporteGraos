
import React from 'react';
import { PerformanceReport } from '../types';
import { settingsService } from '../../../services/settingsService';
import { formatMoney } from '../../../utils/formatters';
import FinancialKPIs from '../components/FinancialKPIs';
import OperationalStats from '../components/OperationalStats';
import EvolutionChart from '../components/EvolutionChart';
import QuantityChart from '../components/QuantityChart';
import PriceTrendChart from '../components/PriceTrendChart';
import CostTrendChart from '../components/CostTrendChart';
import HarvestBreakdown from '../components/HarvestBreakdown';
import ExpenseStructure from '../components/ExpenseStructure';
import { Sprout, BarChart3, Activity, Table } from 'lucide-react';

interface Props {
  data: PerformanceReport;
  periodLabel: string;
}

const PerformanceReportTemplate: React.FC<Props> = ({ data, periodLabel }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  return (
    <div id="performance-pdf-content" className="relative w-full bg-white text-slate-950 p-10 font-sans min-h-[210mm] flex flex-col box-border overflow-hidden">
      
      {/* MARCA D'ÁGUA TÉCNICA */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {watermark.imageUrl ? (
          <img 
            src={watermark.imageUrl} 
            alt="BG" 
            className="w-[60%] object-contain opacity-[0.04]"
          />
        ) : (
          <Sprout size={400} className="text-slate-100 opacity-10" />
        )}
      </div>

      <div className="relative z-10 flex-1 flex flex-col space-y-6">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-2">
          <div className="flex gap-4 items-center">
            <div className="h-12 flex items-center shrink-0">
               {company.logoUrl ? (
                 <img src={company.logoUrl} className="max-h-full w-auto object-contain" alt="Logo" />
               ) : (
                 <Sprout size={32} className="text-slate-300" />
               )}
            </div>
            <div>
              <h1 className="text-lg font-black uppercase text-slate-900 leading-none">{company.razaoSocial}</h1>
              <div className="text-slate-600 text-[8px] mt-1.5 space-y-0.5 font-bold uppercase">
                <p>CNPJ: {company.cnpj} | {company.cidade}/{company.uf} • {company.telefone}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Relatório de Performance Analítica</h2>
            <div className="flex items-center gap-2 justify-end mt-1.5">
                <span className="text-[9px] font-black text-blue-700 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">DRE Gerencial</span>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Período: {periodLabel}</span>
            </div>
          </div>
        </div>

        {/* SEÇÃO 1: KPIs FINANCEIROS E OPERACIONAIS INTEGRADOS */}
        <div className="break-inside-avoid">
           <FinancialKPIs 
              revenue={data.totalRevenue} 
              debits={data.totalDebits} 
              balance={data.balance} 
           />
        </div>

        <div className="break-inside-avoid">
           <OperationalStats data={data} />
        </div>

        {/* SEÇÃO 2: GRÁFICOS LADO A LADO - FILEIRA 1 */}
        <div className="grid grid-cols-2 gap-6 break-inside-avoid">
            <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm">
                <QuantityChart data={data.monthlyHistory} />
            </div>
            <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm">
                <PriceTrendChart data={data.priceTrendHistory} />
            </div>
        </div>

        {/* SEÇÃO 3: GRÁFICOS UNITÁRIOS E DRE - FILEIRA 2 */}
        <div className="grid grid-cols-2 gap-6 break-inside-avoid">
            <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm">
                <CostTrendChart data={data.monthlyHistory} />
            </div>
            <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm">
                <EvolutionChart data={data.monthlyHistory} />
            </div>
        </div>

        {/* SEÇÃO 4: PERFORMANCE GEOGRÁFICA / SAFRA (WIDE) */}
        <div className="break-inside-avoid">
            <HarvestBreakdown harvests={data.harvests} />
        </div>

        {/* SEÇÃO 5: TABELA MENSAL */}
        <div className="break-inside-avoid pb-10">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center gap-2">
              <Table size={16} className="text-slate-500" />
              <h3 className="font-bold text-slate-800 text-[10px] uppercase tracking-widest">Demonstrativo Mensal Consolidado</h3>
            </div>
            <table className="w-full text-left text-[9px] text-slate-600">
              <thead className="bg-white border-b border-slate-100 text-[8px] uppercase text-slate-400 font-black">
                <tr>
                  <th className="px-4 py-2">Mês/Ano</th>
                  <th className="px-4 py-2 text-right">Faturamento</th>
                  <th className="px-4 py-2 text-right">Custos Dir.</th>
                  <th className="px-4 py-2 text-right">Saldo Líq.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-bold">
                {data.monthlyHistory.map(m => (
                  <tr key={m.fullDate}>
                    <td className="px-4 py-2 font-black text-slate-800 uppercase">{m.name} {m.fullDate.split('-')[0]}</td>
                    <td className="px-4 py-2 text-right text-emerald-700">{formatMoney(m.revenue)}</td>
                    <td className="px-4 py-2 text-right text-rose-700">{formatMoney(m.purchaseCost + m.freightCost)}</td>
                    <td className={`px-4 py-2 text-right font-black ${m.netResult >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>{formatMoney(m.netResult)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SEÇÃO 6: BREAKDOWN DESPESAS (NOVA PÁGINA) */}
        <div className="break-inside-avoid pb-10" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
          <div className="flex items-center gap-2 px-1 mb-4">
            <BarChart3 size={16} className="text-slate-400" />
            <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest italic">Breakdown Despesas</h3>
          </div>
          <ExpenseStructure data={data.expenseBreakdown} />
        </div>

        {/* RODAPÉ TÉCNICO */}
        <div className="mt-auto pt-4 border-t border-slate-200 flex justify-between items-center text-[7px] font-black text-slate-400 uppercase tracking-widest">
           <span>ERP Suporte Grãos • Exportação Oficial de Inteligência de Mercado</span>
           <span>Autenticado em {new Date().toLocaleString('pt-BR')}</span>
        </div>
      </div>
    </div>
  );
};

export default PerformanceReportTemplate;
