
import React from 'react';
import ReportLayout from '../../components/ReportLayout';
import { GeneratedReportData } from '../../types';

const PartnerSummaryTemplate: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(!val || Math.abs(val) < 0.005 ? 0 : val);
  const dateStr = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const grandTotal = data.summary?.[0]?.value || 0;

  return (
    <ReportLayout title={data.title} subtitle={data.subtitle}>
      {data.rows.length === 0 ? (
        <div className="py-20 text-center text-slate-400 italic font-bold uppercase tracking-widest border-2 border-dashed rounded-2xl">
          Nenhum dado encontrado para os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-8">
          {data.rows.map((group: any) => (
            <div key={group.partnerName} className="break-inside-avoid">
              <div className="bg-slate-900 text-white px-4 py-2 flex justify-between items-center rounded-t-lg">
                <h3 className="font-black uppercase text-xs tracking-tight">{group.partnerName}</h3>
                <div className="text-right">
                   <span className="text-[8px] font-bold text-slate-400 uppercase mr-2">Total no Período</span>
                   <span className="text-sm font-black text-emerald-400">{currency(group.total)}</span>
                </div>
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase border-b border-slate-300">
                    <th className="py-2 px-3 text-left w-24">Vencimento</th>
                    <th className="py-2 px-3 text-left">Descrição do Título / Origem</th>
                    <th className="py-2 px-3 text-right">Valor Pendente</th>
                  </tr>
                </thead>
                <tbody className="text-[10px]">
                  {group.items.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-2 px-3 font-bold text-slate-800">{dateStr(item.date)}</td>
                      <td className="py-2 px-3 text-slate-600 uppercase">{item.description}</td>
                      <td className="py-2 px-3 text-right font-black text-slate-900">{currency(item.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* GRAN TOTAL */}
          <div className="mt-10 pt-4 border-t-4 border-slate-900 flex justify-end">
             <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl text-right min-w-[300px]">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Consolidado Final do Relatório</p>
                <h2 className="text-3xl font-black text-white">{currency(grandTotal)}</h2>
             </div>
          </div>
        </div>
      )}
    </ReportLayout>
  );
};

export default PartnerSummaryTemplate;
