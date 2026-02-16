
import React from 'react';
import ReportLayout from '../../components/ReportLayout';
import { GeneratedReportData } from '../../types';

const Template: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(!val || Math.abs(val) < 0.005 ? 0 : val);

  return (
    <ReportLayout title={data.title} subtitle={data.subtitle}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-950 text-white border-b border-slate-900 font-black uppercase text-[7px]">
              {data.columns.map((col, idx) => (
                <th key={idx} className={`py-2 px-2 text-${col.align || 'left'} border-x border-slate-700`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-[8px]">
            {data.rows.map((row: any, idx: number) => (
              <tr key={idx} className={`border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                {data.columns.map((col, cIdx) => (
                  <td key={cIdx} className={`py-1.5 px-2 text-${col.align || 'left'} text-slate-950 font-black border-x border-slate-100`}>
                    {col.format === 'currency' ? currency(row[col.accessor]) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 p-5 bg-slate-50 border-2 border-slate-950 rounded-xl break-inside-avoid">
        <h4 className="text-[9px] font-black text-slate-950 uppercase mb-2 tracking-tighter">Nota de Auditoria Bancária</h4>
        <p className="text-[8px] text-slate-800 leading-relaxed font-bold italic">
          Os valores acima representam o saldo conciliado de cada conta bancária no primeiro horário do dia 1º de cada mês citado. 
          Este demonstrativo considera o Saldo Inicial de implantação somado a todos os fluxos de caixa (Vendas, Compras, Fretes e Despesas) efetivados no sistema.
        </p>
      </div>
    </ReportLayout>
  );
};

export default Template;
