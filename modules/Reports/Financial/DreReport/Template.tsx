
import React from 'react';
import ReportLayout from '../../components/ReportLayout';
import { GeneratedReportData } from '../../types';

const Template: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const margin = data.summary?.[0]?.value || 0;

  return (
    <ReportLayout title={data.title} subtitle={data.subtitle}>
      <div className="max-w-2xl mx-auto mt-8 border border-slate-300 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full border-collapse">
          <tbody>
            {data.rows.map((row: any, idx: number) => {
              const isFixedHeader = row.label === '(-) Despesas Fixas';
              const isAdminHeader = row.label === '(-) Despesas Administrativas';
              const details = (data as any).detailedExpenses || [];

              return (
                <React.Fragment key={idx}>
                  <tr className={`
                    ${row.isHeader ? 'bg-slate-900 text-white font-black' : ''}
                    ${row.isTotal ? 'bg-slate-100 font-bold border-t-2 border-slate-900' : ''}
                    ${row.isFinal ? 'bg-blue-900 text-white font-black text-base' : 'border-b border-slate-100'}
                  `}>
                    <td className={`py-3 px-4 ${row.indent ? 'pl-10 text-slate-500 italic' : ''}`}>
                      {row.label}
                    </td>
                    <td className={`py-3 px-4 text-right ${row.value < 0 ? 'text-rose-500' : ''} ${row.isHeader || row.isFinal ? 'text-current' : ''}`}>
                      {currency(row.value)}
                    </td>
                  </tr>
                  
                  {/* Injeta detalhes específicos da categoria logo abaixo do cabeçalho do tipo */}
                  {isFixedHeader && details.filter((d: any) => d.type === 'fixed').map((det: any, dIdx: number) => (
                    <tr key={`fix-${dIdx}`} className="bg-slate-50/50 border-b border-slate-100 text-[10px]">
                      <td className="py-1 px-4 pl-16 text-slate-400 italic">{det.label}</td>
                      <td className="py-1 px-4 text-right text-slate-400">{currency(det.value)}</td>
                    </tr>
                  ))}

                  {isAdminHeader && details.filter((d: any) => d.type === 'administrative').map((det: any, dIdx: number) => (
                    <tr key={`adm-${dIdx}`} className="bg-slate-50/50 border-b border-slate-100 text-[10px]">
                      <td className="py-1 px-4 pl-16 text-slate-400 italic">{det.label}</td>
                      <td className="py-1 px-4 text-right text-slate-400">{currency(det.value)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        
        <div className="bg-slate-50 p-6 text-center border-t border-slate-200">
           <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Margem Líquida sobre Vendas</p>
           <p className={`text-2xl font-black ${margin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
             {margin.toFixed(2)}%
           </p>
        </div>
      </div>
    </ReportLayout>
  );
};

export default Template;
