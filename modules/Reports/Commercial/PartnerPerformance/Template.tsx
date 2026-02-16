
import React from 'react';
import ReportLayout from '../../components/ReportLayout';
import { GeneratedReportData } from '../../types';

const Template: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const number = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(val);

  const totalVal = data.summary?.[0]?.value || 0;

  return (
    <ReportLayout title={data.title} subtitle={data.subtitle}>
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300">
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700">Parceiro</th>
            <th className="py-2 px-2 text-center font-bold uppercase text-slate-700">Relacionamento</th>
            <th className="py-2 px-2 text-center font-bold uppercase text-slate-700">Nº Pedidos</th>
            <th className="py-2 px-2 text-right font-bold uppercase text-slate-700">Volume (SC)</th>
            <th className="py-2 px-2 text-right font-bold uppercase text-slate-700">Total Negociado</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row: any, idx: number) => (
            <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
              <td className="py-1.5 px-2 font-medium">{row.name}</td>
              <td className="py-1.5 px-2 text-center text-[9px]">
                <span className={`px-2 py-0.5 rounded-full ${row.type === 'Fornecedor' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {row.type}
                </span>
              </td>
              <td className="py-1.5 px-2 text-center">{row.count}</td>
              <td className="py-1.5 px-2 text-right">{number(row.volume)}</td>
              <td className="py-1.5 px-2 text-right font-bold text-slate-800">{currency(row.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end border-t-2 border-slate-800 pt-4">
        <div className="text-right">
          <p className="text-[9px] uppercase font-bold text-slate-500">Volume Financeiro Total</p>
          <p className="text-sm font-bold text-slate-900">{currency(totalVal)}</p>
        </div>
      </div>
    </ReportLayout>
  );
};

export default Template;
