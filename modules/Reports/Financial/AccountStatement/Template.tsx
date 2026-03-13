
import React from 'react';
import ReportLayout from '../../components/ReportLayout';
import { GeneratedReportData } from '../../types';
import { useSettings } from '../../../../hooks/useSettings';

const Template: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const { company } = useSettings();
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(!val || Math.abs(val) < 0.005 ? 0 : val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const prevBalance = data.summary?.find(s => s.label === 'Saldo Anterior')?.value || 0;
  const finalBalance = data.summary?.find(s => s.label === 'Saldo Final')?.value || 0;
  const credits = data.summary?.find(s => s.label === 'Total Entradas')?.value || 0;
  const debits = data.summary?.find(s => s.label === 'Total Saídas')?.value || 0;

  return (
    <ReportLayout title={data.title} subtitle={data.subtitle}>

      {/* BOX DE SALDO ANTERIOR */}
      <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl mb-6 shadow-md">
        <div>
          <p className="text-[8px] uppercase font-black text-slate-400 tracking-widest mb-1">Saldo Anterior Transportado</p>
          <p className="text-xl font-black">{currency(prevBalance)}</p>
        </div>
        <div className="flex gap-10 pr-4">
          <div className="text-right">
            <p className="text-[8px] uppercase font-black text-emerald-400 tracking-widest mb-1">Entradas</p>
            <p className="text-sm font-black">{currency(credits)}</p>
          </div>
          <div className="text-right border-l border-white/10 pl-10">
            <p className="text-[8px] uppercase font-black text-rose-400 tracking-widest mb-1">Saídas</p>
            <p className="text-sm font-black">{currency(debits)}</p>
          </div>
        </div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-100 border-y-2 border-slate-300">
            <th className="py-2 px-2 text-left font-black uppercase text-slate-700 text-[8px] w-20">Data</th>
            <th className="py-2 px-2 text-left font-black uppercase text-slate-700 text-[8px]">Histórico / Descrição</th>
            <th className="py-2 px-2 text-left font-black uppercase text-slate-700 text-[8px] w-24">Natureza</th>
            <th className="py-2 px-2 text-right font-black uppercase text-slate-700 text-[8px] w-24">Entrada (+)</th>
            <th className="py-2 px-2 text-right font-black uppercase text-slate-700 text-[8px] w-24">Saída (-)</th>
            <th className="py-2 px-2 text-right font-black uppercase text-slate-900 text-[8px] w-28 bg-slate-200/50">Saldo Acum.</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.length === 0 ? (
            <tr><td colSpan={6} className="py-10 text-center text-slate-400 font-bold italic">Nenhuma movimentação no período.</td></tr>
          ) : (
            data.rows.map((row: any, idx: number) => (
              <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                <td className="py-2 px-2 text-[9px] font-bold text-slate-500">{date(row.date)}</td>
                <td className="py-2 px-2">
                  <p className="text-[9px] font-black text-slate-900 uppercase leading-none">{row.description}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Ref: {row.entity}</p>
                </td>
                <td className="py-2 px-2 text-[8px] font-bold text-slate-500 uppercase">{row.category}</td>
                <td className="py-2 px-2 text-right text-emerald-700 font-bold text-[9px]">{row.credit ? currency(row.credit) : ''}</td>
                <td className="py-2 px-2 text-right text-rose-700 font-bold text-[9px]">{row.debit ? currency(row.debit) : ''}</td>
                <td className={`py-2 px-2 text-right font-black text-[10px] bg-slate-50/50 ${row.balanceAfter >= 0 ? 'text-slate-900' : 'text-rose-800'}`}>
                  {currency(row.balanceAfter)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* SALDO FINAL EM DESTAQUE */}
      <div className="mt-8 flex justify-end">
        <div className="bg-slate-900 p-6 rounded-2xl shadow-xl text-right min-w-[250px] border-b-4 border-blue-500">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Saldo Final em Conta</p>
          <h2 className={`text-2xl font-black ${finalBalance >= 0 ? 'text-white' : 'text-rose-400'}`}>{currency(finalBalance)}</h2>
          <p className="text-[8px] text-slate-500 font-bold uppercase mt-1">Conciliado via {company.nomeFantasia || 'ERP'}</p>
        </div>
      </div>
    </ReportLayout>
  );
};

export default Template;
