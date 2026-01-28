
import React from 'react';
import ReportLayout from '../../components/ReportLayout';
import { GeneratedReportData } from '../../types';

const Template: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const passiveTotal = data.summary?.[0]?.value || 0;
  const activeTotal = data.summary?.[1]?.value || 0;

  return (
    <ReportLayout title={data.title} subtitle={data.subtitle}>
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300">
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700">Entidade / Banco</th>
            <th className="py-2 px-2 text-center font-bold uppercase text-slate-700">Tipo</th>
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700">Datas</th>
            <th className="py-2 px-2 text-right font-bold uppercase text-slate-700">Valor Original</th>
            <th className="py-2 px-2 text-right font-bold uppercase text-slate-700">Saldo Atual</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row: any, idx: number) => (
            <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
              <td className="py-2 px-2 font-medium">{row.entityName}</td>
              <td className="py-2 px-2 text-center text-[9px] uppercase">
                 <span className={`px-2 py-0.5 rounded ${row.type === 'taken' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {row.typeLabel}
                 </span>
              </td>
              <td className="py-2 px-2 text-[9px]">
                 <div>Início: {date(row.contractDate)}</div>
                 <div className="text-slate-500">Venc: {date(row.nextDueDate)}</div>
              </td>
              <td className="py-2 px-2 text-right text-slate-500">
                 {currency(row.totalValue)}
                 <div className="text-[9px]">{row.rateLabel}</div>
              </td>
              <td className="py-2 px-2 text-right font-bold text-slate-800">{currency(row.remainingValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end gap-8 border-t-2 border-slate-800 pt-4">
        <div className="text-right">
          <p className="text-[9px] uppercase font-bold text-slate-500">Total a Receber</p>
          <p className="text-sm font-bold text-emerald-700">{currency(activeTotal)}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase font-bold text-slate-500">Total a Pagar</p>
          <p className="text-sm font-bold text-rose-700">{currency(passiveTotal)}</p>
        </div>
      </div>
    </ReportLayout>
  );
};

export default Template;
