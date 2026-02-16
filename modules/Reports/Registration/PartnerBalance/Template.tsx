
import React from 'react';
import ReportLayout from '../../components/ReportLayout';
import { GeneratedReportData } from '../../types';

const Template: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  const tCredits = data.summary?.[0]?.value || 0;
  const tDebits = data.summary?.[1]?.value || 0;
  const tBalance = data.summary?.[2]?.value || 0;

  return (
    <ReportLayout title={data.title} subtitle={data.subtitle}>
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300">
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700">Parceiro</th>
            <th className="py-2 px-2 text-right font-bold uppercase text-slate-700">Créditos (Receber)</th>
            <th className="py-2 px-2 text-right font-bold uppercase text-slate-700">Débitos (Pagar)</th>
            <th className="py-2 px-2 text-right font-bold uppercase text-slate-700">Saldo Líquido</th>
            <th className="py-2 px-2 text-center font-bold uppercase text-slate-700">Situação</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row: any, idx: number) => (
            <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
              <td className="py-1.5 px-2 font-bold text-slate-700">{row.partner}</td>
              <td className="py-1.5 px-2 text-right text-emerald-700">{currency(row.credits)}</td>
              <td className="py-1.5 px-2 text-right text-rose-700">{currency(row.debits)}</td>
              <td className={`py-1.5 px-2 text-right font-bold ${row.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {currency(Math.abs(row.balance))}
              </td>
              <td className="py-1.5 px-2 text-center text-[9px] uppercase font-bold">
                {row.balance > 0 ? (
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">A Receber</span>
                ) : row.balance < 0 ? (
                  <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded">A Pagar</span>
                ) : (
                  <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Zerado</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end gap-8 border-t-2 border-slate-800 pt-4">
        <div className="text-right">
          <p className="text-[9px] uppercase font-bold text-slate-500">Total Créditos</p>
          <p className="text-sm font-bold text-emerald-700">{currency(tCredits)}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase font-bold text-slate-500">Total Débitos</p>
          <p className="text-sm font-bold text-rose-700">{currency(tDebits)}</p>
        </div>
        <div className="text-right border-l pl-8">
          <p className="text-[9px] uppercase font-bold text-slate-500">Saldo Geral</p>
          <p className={`text-xl font-bold ${tBalance >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
            {currency(tBalance)}
          </p>
        </div>
      </div>
    </ReportLayout>
  );
};

export default Template;
