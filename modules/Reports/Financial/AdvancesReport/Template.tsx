
import React from 'react';
import ReportLayout from '../../components/ReportLayout';
import { GeneratedReportData } from '../../types';

const Template: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const totalGiven = data.summary?.find(s => s.label.includes('Total Concedido'))?.value || 0;
  const totalTaken = data.summary?.find(s => s.label.includes('Total Recebido'))?.value || 0;

  return (
    <ReportLayout title={data.title} subtitle={data.subtitle}>
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300">
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700 w-24">Data</th>
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700">Parceiro</th>
            <th className="py-2 px-2 text-center font-bold uppercase text-slate-700">Tipo</th>
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700">Descrição / Motivo</th>
            <th className="py-2 px-2 text-center font-bold uppercase text-slate-700">Status</th>
            <th className="py-2 px-2 text-right font-bold uppercase text-slate-700">Valor</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row: any, idx: number) => (
            <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
              <td className="py-1.5 px-2 font-mono">{date(row.date)}</td>
              <td className="py-1.5 px-2 font-bold text-slate-800">{row.partnerName}</td>
              <td className="py-1.5 px-2 text-center">
                 <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-black ${
                     row.type === 'given' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                 }`}>
                    {row.type === 'given' ? 'Concedido' : 'Recebido'}
                 </span>
              </td>
              <td className="py-1.5 px-2 text-[9px] text-slate-600">{row.description}</td>
              <td className="py-1.5 px-2 text-center text-[9px] uppercase">
                 {row.status === 'active' ? 'Aberto' : 'Quitado'}
              </td>
              <td className={`py-1.5 px-2 text-right font-bold ${row.type === 'given' ? 'text-indigo-700' : 'text-amber-700'}`}>
                 {currency(row.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end gap-10 border-t-2 border-slate-800 pt-4">
        <div className="text-right">
          <p className="text-[9px] uppercase font-bold text-slate-500">Total Concedido (Ativo)</p>
          <p className="text-sm font-bold text-indigo-700">{currency(totalGiven)}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase font-bold text-slate-500">Total Recebido (Passivo)</p>
          <p className="text-sm font-bold text-amber-700">{currency(totalTaken)}</p>
        </div>
      </div>
    </ReportLayout>
  );
};

export default Template;
