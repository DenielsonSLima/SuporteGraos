
import React from 'react';
import ReportLayout from '../../components/ReportLayout';
import { GeneratedReportData } from '../../types';

const Template: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const totalPending = data.summary?.find(s => s.label.includes('Total a Pagar'))?.value || 0;

  return (
    <ReportLayout title={data.title} subtitle={data.subtitle}>
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300">
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700">Vencimento</th>
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700">Beneficiário</th>
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700">Categoria</th>
            <th className="py-2 px-2 text-right font-bold uppercase text-slate-700">Valor Orig.</th>
            <th className="py-2 px-2 text-right font-bold uppercase text-slate-700">Saldo Devedor</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row: any, idx: number) => (
            <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
              <td className="py-1.5 px-2 font-mono">{date(row.dueDate)}</td>
              <td className="py-1.5 px-2">
                <div className="font-bold text-slate-800">{row.entityName}</div>
                <div className="text-[8px] text-slate-500">{row.description}</div>
              </td>
              <td className="py-1.5 px-2">{row.category}</td>
              <td className="py-1.5 px-2 text-right text-slate-500">{currency(row.originalValue)}</td>
              <td className="py-1.5 px-2 text-right font-bold text-rose-700">{currency(row.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end border-t-2 border-slate-800 pt-4">
        <div className="text-right">
          <p className="text-[9px] uppercase font-bold text-slate-500">Total a Pagar</p>
          <p className="text-xl font-bold text-rose-600">{currency(totalPending)}</p>
        </div>
      </div>
    </ReportLayout>
  );
};

export default Template;
