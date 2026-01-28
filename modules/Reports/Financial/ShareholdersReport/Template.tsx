
import React from 'react';
import ReportLayout from '../../components/ReportLayout';
import { GeneratedReportData } from '../../types';

const Template: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const total = data.summary?.[0]?.value || 0;

  return (
    <ReportLayout title={data.title} subtitle={data.subtitle}>
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300">
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700">Nome do Sócio</th>
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700">Documento</th>
            <th className="py-2 px-2 text-right font-bold uppercase text-slate-700">Pro-Labore Configurado</th>
            <th className="py-2 px-2 text-right font-bold uppercase text-slate-700">Saldo Disponível</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row: any, idx: number) => (
            <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
              <td className="py-2 px-2 font-medium">{row.name}</td>
              <td className="py-2 px-2 font-mono text-slate-600">{row.cpf}</td>
              <td className="py-2 px-2 text-right text-slate-600">{currency(row.proLabore)}</td>
              <td className="py-2 px-2 text-right font-bold text-lg text-slate-800">{currency(row.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end border-t-2 border-slate-800 pt-4">
        <div className="text-right">
          <p className="text-[9px] uppercase font-bold text-slate-500">Saldo Total Acumulado</p>
          <p className="text-xl font-bold text-slate-900">{currency(total)}</p>
        </div>
      </div>
    </ReportLayout>
  );
};

export default Template;
