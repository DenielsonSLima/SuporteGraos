
import React from 'react';
import ReportLayout from '../../components/ReportLayout';
import { GeneratedReportData } from '../../types';

const Template: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const number = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val);
  const numberInt = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const totalCost = data.summary?.find(s => s.label.includes('Total Fretes'))?.value || 0;
  const totalVolume = data.summary?.find(s => s.label.includes('Total Volume'))?.value || 0;
  const totalBreakage = data.summary?.find(s => s.label.includes('Total Quebra'))?.value || 0;

  return (
    <ReportLayout title={data.title} subtitle={data.subtitle}>
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300">
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700 text-[9px]">Data</th>
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700 text-[9px]">Placa / Transp.</th>
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700 text-[9px]">Rota</th>
            <th className="py-2 px-2 text-right font-bold uppercase text-slate-700 text-[9px]">P. Origem (Kg)</th>
            <th className="py-2 px-2 text-right font-bold uppercase text-slate-700 text-[9px]">P. Destino (Kg)</th>
            <th className="py-2 px-2 text-right font-bold uppercase text-slate-700 text-[9px]">Quebra (Kg)</th>
            <th className="py-2 px-2 text-right font-bold uppercase text-slate-700 text-[9px]">Valor Frete</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row: any, idx: number) => (
            <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
              <td className="py-1.5 px-2 text-[9px]">{date(row.date)}</td>
              <td className="py-1.5 px-2">
                <div className="font-bold text-[9px]">{row.plate}</div>
                <div className="text-[8px] text-slate-500 truncate max-w-[100px]">{row.carrier}</div>
              </td>
              <td className="py-1.5 px-2 text-[8px]">{row.route}</td>
              <td className="py-1.5 px-2 text-right text-[9px]">{numberInt(row.weightOrigin)}</td>
              <td className="py-1.5 px-2 text-right text-[9px]">
                {row.weightDest > 0 ? numberInt(row.weightDest) : '-'}
              </td>
              <td className={`py-1.5 px-2 text-right font-medium text-[9px] ${row.breakage > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                {row.breakage > 0 ? numberInt(row.breakage) : '-'}
              </td>
              <td className="py-1.5 px-2 text-right text-[9px]">{currency(row.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end gap-8 border-t-2 border-slate-800 pt-4">
        <div className="text-right">
          <p className="text-[9px] uppercase font-bold text-slate-500">Volume Total Origem</p>
          <p className="text-sm font-bold text-slate-900">{number(totalVolume)} TON</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase font-bold text-slate-500">Total Quebra</p>
          <p className="text-sm font-bold text-red-600">{numberInt(totalBreakage)} KG</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase font-bold text-slate-500">Custo Frete Total</p>
          <p className="text-sm font-bold text-slate-900">{currency(totalCost)}</p>
        </div>
      </div>
    </ReportLayout>
  );
};

export default Template;
