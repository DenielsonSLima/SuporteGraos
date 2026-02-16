
import React from 'react';
import ReportLayout from '../../components/ReportLayout';
import { GeneratedReportData } from '../../types';

const Template: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const totalValue = data.summary?.find(s => s.label === 'Total Vendido')?.value || 0;

  return (
    <ReportLayout title={data.title} subtitle={data.subtitle}>
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300">
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700">Data</th>
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700">Nº Venda</th>
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700">Cliente</th>
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700">Produto</th>
            <th className="py-2 px-2 text-right font-bold uppercase text-slate-700">Qtd.</th>
            <th className="py-2 px-2 text-right font-bold uppercase text-slate-700">Carregado</th>
            <th className="py-2 px-2 text-right font-bold uppercase text-slate-700">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row: any, idx: number) => (
            <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
              <td className="py-1.5 px-2">{date(row.date)}</td>
              <td className="py-1.5 px-2 font-mono">{row.number}</td>
              <td className="py-1.5 px-2">{row.customerName}</td>
              <td className="py-1.5 px-2">{row.productName}</td>
              <td className="py-1.5 px-2 text-right">{row.qty}</td>
              <td className="py-1.5 px-2 text-right">{row.loaded}</td>
              <td className="py-1.5 px-2 text-right">{currency(row.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end border-t-2 border-slate-800 pt-4">
        <div className="text-right">
          <p className="text-[9px] uppercase font-bold text-slate-500">Faturamento Total</p>
          <p className="text-sm font-bold text-emerald-700">{currency(totalValue)}</p>
        </div>
      </div>
    </ReportLayout>
  );
};

export default Template;
