
import React from 'react';
import { LoanRecord } from '../../types';
import { settingsService } from '../../../../services/settingsService';
import { Sprout } from 'lucide-react';

interface Props {
  loans: LoanRecord[];
  tab: 'taken' | 'granted' | 'history' | 'all';
}

const LoanListTemplate: React.FC<Props> = ({ loans, tab }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(!val || Math.abs(val) < 0.005 ? 0 : val);
  const dateStr = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const titles: Record<string, string> = {
    all: 'Relatório de Empréstimos Ativos',
    taken: 'Relatório de Empréstimos Tomados (Passivos)',
    granted: 'Relatório de Empréstimos Concedidos (Ativos)',
    history: 'Histórico Consolidado de Contratos de Crédito'
  };

  const totalOriginal = loans.reduce((acc, l) => acc + l.totalValue, 0);
  const totalBalance = loans.reduce((acc, l) => acc + l.remainingValue, 0);

  return (
    <div id="loan-list-pdf" className="relative w-full bg-white text-slate-950 p-10 text-[9px] leading-tight font-sans min-h-[297mm] flex flex-col box-border overflow-hidden">
      
      {/* MARCA D'ÁGUA */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {watermark.imageUrl ? (
          <img 
            src={watermark.imageUrl} 
            alt="BG" 
            className="w-[70%] object-contain opacity-[0.05]"
          />
        ) : (
          <Sprout size={300} className="text-slate-100 opacity-20" />
        )}
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        {/* CABEÇALHO */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
          <div className="flex gap-4 items-center">
            <div className="h-16 w-auto flex items-center shrink-0">
               {company.logoUrl ? (
                 <img src={company.logoUrl} className="max-h-full w-auto object-contain" alt="Logo" />
               ) : (
                 <Sprout size={32} className="text-slate-300" />
               )}
            </div>
            <div>
              <h1 className="text-xs font-black uppercase text-slate-900 leading-none">{company.razaoSocial}</h1>
              <p className="text-slate-700 text-[8px] mt-1.5 font-bold uppercase">
                CNPJ: {company.cnpj} | {company.cidade}/{company.uf}
              </p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-base font-black text-slate-950 uppercase italic tracking-tighter leading-none">{titles[tab]}</h2>
            <p className="text-[7px] text-slate-500 mt-2 font-black uppercase">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>

        {/* RESUMO DE TOTAIS */}
        <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-md">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-1">Montante Original Consolidado</span>
                <p className="text-xl font-black">{currency(totalOriginal)}</p>
            </div>
            <div className="bg-slate-50 border-2 border-slate-950 p-4 rounded-xl">
                <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest block mb-1">Saldo Devedor Atual</span>
                <p className="text-xl font-black text-slate-950">{currency(totalBalance)}</p>
            </div>
        </div>

        {/* TABELA DE REGISTROS */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white uppercase font-black text-[7px]">
              <th className="py-2 px-2 text-left border-r border-slate-800">Início</th>
              <th className="py-2 px-2 text-left border-r border-slate-800">Entidade / Banco</th>
              <th className="py-2 px-2 text-center border-r border-slate-800">Status</th>
              <th className="py-2 px-2 text-right border-r border-slate-800">V. Original</th>
              <th className="py-2 px-2 text-center border-r border-slate-800">Taxa</th>
              <th className="py-2 px-2 text-right">Saldo Atual</th>
            </tr>
          </thead>
          <tbody className="font-bold text-slate-900">
            {loans.map((loan, idx) => (
              <tr key={loan.id} className={`border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                <td className="py-2.5 px-2">{dateStr(loan.contractDate)}</td>
                <td className="py-2.5 px-2">
                   <p className="font-black uppercase leading-tight">{loan.entityName}</p>
                   {(tab === 'history' || tab === 'all') && (
                       <p className="text-[6px] text-slate-500 uppercase">{loan.type === 'taken' ? 'Passivo' : 'Ativo'}</p>
                   )}
                </td>
                <td className="py-2.5 px-2 text-center">
                   <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase border ${
                       loan.status === 'active' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-slate-200 text-slate-600 border-slate-300'
                   }`}>
                      {loan.status === 'active' ? 'Aberto' : 'Liquidado'}
                   </span>
                </td>
                <td className="py-2.5 px-2 text-right text-slate-500">{currency(loan.totalValue)}</td>
                <td className="py-2.5 px-2 text-center">{loan.interestRate}%</td>
                <td className={`py-2.5 px-2 text-right font-black ${loan.type === 'taken' ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {currency(loan.remainingValue)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
             <tr className="bg-slate-200 font-black text-slate-950 uppercase text-[8px] border-t-2 border-slate-950">
                <td colSpan={3} className="py-3 px-2 text-right">Totais Consolidados:</td>
                <td className="py-3 px-2 text-right">{currency(totalOriginal)}</td>
                <td></td>
                <td className="py-3 px-2 text-right text-lg">{currency(totalBalance)}</td>
             </tr>
          </tfoot>
        </table>

        {/* ASSINATURAS E RODAPÉ */}
        <div className="mt-auto pt-10 border-t border-slate-200">
           <div className="grid grid-cols-2 gap-24 pt-4 text-center">
            <div>
              <div className="border-t-2 border-slate-950 pt-2">
                <p className="font-black text-slate-950 uppercase text-[10px]">{company.razaoSocial}</p>
                <p className="text-[7px] uppercase text-slate-500 font-black tracking-widest mt-1">Departamento Financeiro</p>
              </div>
            </div>
            <div>
                <div className="border-t-2 border-slate-950 pt-2">
                  <p className="font-black text-slate-950 uppercase text-[10px]">Auditoria / Contabilidade</p>
                  <p className="text-[7px] uppercase text-slate-500 font-black tracking-widest mt-1">Conferência e Registro</p>
                </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center text-[7px] font-black text-slate-400 uppercase tracking-widest">
           <span>Suporte Grãos ERP - Relatório Gerencial de Crédito</span>
           <span>Página 1 de 1</span>
        </div>
      </div>
    </div>
  );
};

export default LoanListTemplate;
