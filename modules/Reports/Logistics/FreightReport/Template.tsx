
import React from 'react';
import ReportLayout from '../../components/ReportLayout';
import { GeneratedReportData } from '../../types';

const Template: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const number = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val);
  const numberInt = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const totalCost = data.summary?.find(s => s.label.includes('Total Fretes'))?.value || 0;
  const totalVolume = data.summary?.find(s => s.label.includes('Total Volume'))?.value || 0;
  const totalBreakage = data.summary?.find(s => s.label.includes('Total Quebra'))?.value || 0;

  return (
    <ReportLayout title={data.title} subtitle={data.subtitle} landscape>
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300">
            <th className="py-2 px-1 text-left font-bold uppercase text-slate-700 text-[8px]">Data</th>
            <th className="py-2 px-1 text-left font-bold uppercase text-slate-700 text-[8px]">Transportadora</th>
            <th className="py-2 px-1 text-left font-bold uppercase text-slate-700 text-[8px]">Motorista</th>
            <th className="py-2 px-1 text-left font-bold uppercase text-slate-700 text-[8px]">Origem</th>
            <th className="py-2 px-1 text-left font-bold uppercase text-slate-700 text-[8px]">Destino</th>
            <th className="py-2 px-1 text-right font-bold uppercase text-slate-700 text-[8px]">Frete/Ton</th>
            <th className="py-2 px-1 text-right font-bold uppercase text-slate-700 text-[8px]">P. Origem</th>
            <th className="py-2 px-1 text-right font-bold uppercase text-slate-700 text-[8px]">P. Destino</th>
            <th className="py-2 px-1 text-center font-bold uppercase text-slate-700 text-[8px]">Base Cálculo</th>
            <th className="py-2 px-1 text-right font-bold uppercase text-slate-700 text-[8px]">Valor Frete</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row: any, idx: number) => (
            <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
              <td className="py-1.5 px-1 text-[8px]">{date(row.date)}</td>
              <td className="py-1.5 px-1 text-[8px] truncate max-w-[90px]">{row.carrier}</td>
              <td className="py-1.5 px-1 text-[8px] truncate max-w-[90px]">{row.driver}</td>
              <td className="py-1.5 px-1 text-[8px] truncate max-w-[80px]">{row.origin}</td>
              <td className="py-1.5 px-1 text-[8px] truncate max-w-[80px]">{row.destination}</td>
              <td className="py-1.5 px-1 text-right text-[8px]">{currency(row.freightPerTon)}</td>
              <td className="py-1.5 px-1 text-right text-[8px]">{numberInt(row.weightOrigin)}</td>
              <td className="py-1.5 px-1 text-right text-[8px]">{row.weightDest > 0 ? numberInt(row.weightDest) : '-'}</td>
              <td className={`py-1.5 px-1 text-center text-[8px] font-bold ${row.weightBase === 'Destino' ? 'text-blue-600' : 'text-amber-600'}`}>{row.weightBase}</td>
              <td className="py-1.5 px-1 text-right text-[8px] font-bold">{currency(row.value)}</td>
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
