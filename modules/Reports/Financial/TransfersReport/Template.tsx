
import React from 'react';
import ReportLayout from '../../components/ReportLayout';
import { GeneratedReportData } from '../../types';

const Template: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');
  
  const total = data.summary?.[0]?.value || 0;

  return (
    <ReportLayout title={data.title} subtitle={data.subtitle}>
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300">
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700">Data</th>
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700">Origem</th>
            <th className="py-2 px-2 text-center font-bold uppercase text-slate-700">➜</th>
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700">Destino</th>
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700">Descrição</th>
            <th className="py-2 px-2 text-right font-bold uppercase text-slate-700">Valor</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row: any, idx: number) => (
            <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
              <td className="py-1.5 px-2">{date(row.date)}</td>
              <td className="py-1.5 px-2 text-rose-700">{row.originAccount}</td>
              <td className="py-1.5 px-2 text-center text-slate-400">➜</td>
              <td className="py-1.5 px-2 text-emerald-700">{row.destinationAccount}</td>
              <td className="py-1.5 px-2 text-xs">{row.description}</td>
              <td className="py-1.5 px-2 text-right font-bold">{currency(row.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end border-t-2 border-slate-800 pt-4">
        <div className="text-right">
          <p className="text-[9px] uppercase font-bold text-slate-500">Volume Total Transferido</p>
          <p className="text-sm font-bold text-slate-900">{currency(total)}</p>
        </div>
      </div>
    </ReportLayout>
  );
};

export default Template;
