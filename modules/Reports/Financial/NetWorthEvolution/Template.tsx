import React from 'react';
import ReportLayout from '../../components/ReportLayout';
import { GeneratedReportData } from '../../types';
import { useSettings } from '../../../../hooks/useSettings';
import { TrendingUp, TrendingDown, ArrowRightCircle } from 'lucide-react';

const Template: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const { company } = useSettings();
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(!val || Math.abs(val) < 0.005 ? 0 : val);
  const formatDate = (val: string) => {
    const d = new Date(val);
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset()); // Ajuste de fuso para data pura
    return d.toLocaleDateString('pt-BR');
  };

  const initialBalance = data.summary?.find(s => s.label === 'Saldo Inicial')?.value || 0;
  const finalBalance = data.summary?.find(s => s.label === 'Saldo Final Projetado')?.value || 0;
  const variation = (data.summary?.find(s => s.label === 'Variação no Período')?.value || 0);

  return (
    <ReportLayout title={data.title} subtitle={data.subtitle}>
      
      {/* HEADER DE INDICADORES SUMÁRIOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-4 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl transform hover:scale-[1.02] transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-white/5 group-hover:text-white/10 transition-colors">
            <ArrowRightCircle size={100} />
          </div>
          <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] mb-2">Saldo Inicial (Líquido)</p>
          <p className="text-2xl font-black">{currency(initialBalance)}</p>
          <div className="mt-2 h-1 w-12 bg-blue-500 rounded-full" />
        </div>

        <div className={`p-6 rounded-2xl shadow-xl transform hover:scale-[1.02] transition-all relative overflow-hidden group ${variation >= 0 ? 'bg-emerald-50 text-emerald-900 border border-emerald-100' : 'bg-rose-50 text-rose-900 border border-rose-100'}`}>
          <div className="absolute -right-4 -top-4 text-black/5">
             {variation >= 0 ? <TrendingUp size={100} /> : <TrendingDown size={100} />}
          </div>
          <p className="text-[10px] uppercase font-black opacity-60 tracking-[0.2em] mb-2">Variação Projetada</p>
          <p className={`text-2xl font-black ${variation >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {variation >= 0 ? '+' : ''}{currency(variation)}
          </p>
          <div className={`mt-2 h-1 w-12 rounded-full ${variation >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
        </div>

        <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-xl transform hover:scale-[1.02] transition-all relative overflow-hidden group shadow-blue-200">
          <div className="absolute -right-4 -top-4 text-white/10 group-hover:text-white/20 transition-colors">
            <TrendingUp size={100} />
          </div>
          <p className="text-[10px] uppercase font-black text-blue-100 tracking-[0.2em] mb-2">Patrimônio Líquido Final</p>
          <p className="text-2xl font-black">{currency(finalBalance)}</p>
          <div className="mt-2 h-1 w-12 bg-white rounded-full" />
        </div>
      </div>

      {/* TABELA DE EVOLUÇÃO */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b-2 border-slate-200">
              <th className="py-4 px-4 text-left font-black uppercase text-slate-500 text-[9px] tracking-widest w-24">Data/Venc.</th>
              <th className="py-4 px-4 text-left font-black uppercase text-slate-500 text-[9px] tracking-widest">Histórico do Lançamento</th>
              <th className="py-4 px-4 text-left font-black uppercase text-slate-500 text-[9px] tracking-widest w-20 text-center">Tipo</th>
              <th className="py-4 px-4 text-right font-black uppercase text-slate-500 text-[9px] tracking-widest w-32">Valor Op.</th>
              <th className="py-4 px-4 text-right font-black uppercase text-slate-900 text-[9px] tracking-widest w-40 bg-slate-100/50">Saldo Patrimonial</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-bold italic">Nenhuma operação identificada no período solicitado.</td></tr>
            ) : (
              data.rows.map((row: any, idx: number) => (
                <tr key={idx} className={`group hover:bg-blue-50/30 transition-colors border-b border-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                  <td className="py-3 px-4 text-[10px] font-bold text-slate-500 whitespace-nowrap">
                    {formatDate(row.date)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                       <span className={`w-1.5 h-1.5 rounded-full ${row.status === 'realized' ? 'bg-emerald-400' : 'bg-blue-400 animate-pulse'}`} />
                       <p className="text-[10px] font-black text-slate-800 uppercase leading-none group-hover:text-blue-700 transition-colors">{row.description}</p>
                    </div>
                    <div className="flex gap-2 mt-1.5">
                       <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded ${row.status === 'realized' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {row.status === 'realized' ? '✓ Realizado' : '⌚ Pendente'}
                       </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-[9px] font-black uppercase ${row.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {row.type === 'IN' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className={`py-3 px-4 text-right font-bold text-[11px] ${row.type === 'IN' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {row.type === 'IN' ? '+' : '-'}{currency(row.value)}
                  </td>
                  <td className={`py-3 px-4 text-right font-black text-[12px] bg-slate-50/50 group-hover:bg-blue-50/50 ${row.balanceAfter >= 0 ? 'text-slate-900' : 'text-rose-800'}`}>
                    {currency(row.balanceAfter)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* RODAPÉ DO DOCUMENTO */}
      <div className="mt-10 flex flex-col items-end gap-2 text-slate-400 font-bold uppercase text-[9px] tracking-tighter">
        <p>Relatório emitido em: {new Date().toLocaleString('pt-BR')}</p>
        <p>Sistema: {company.nomeFantasia || 'Suporte Grãos ERP'}</p>
      </div>

    </ReportLayout>
  );
};

export default Template;
