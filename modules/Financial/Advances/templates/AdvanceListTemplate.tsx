
import React from 'react';
import { AdvanceTransaction } from '../types';
import { settingsService } from '../../../../services/settingsService';
import { Sprout, Wallet } from 'lucide-react';

interface Props {
  transactions: AdvanceTransaction[];
  tab: 'taken' | 'given' | 'history';
}

const AdvanceListTemplate: React.FC<Props> = ({ transactions, tab }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const dateStr = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const titles = {
    taken: 'Relatório de Adiantamentos Recebidos (Passivos)',
    given: 'Relatório de Adiantamentos Concedidos (Ativos)',
    history: 'Histórico de Adiantamentos e Acertos de Conta'
  };

  const totalValue = transactions.reduce((acc, t) => acc + t.value, 0);

  return (
    <div id="advance-list-pdf" className="relative w-full bg-white text-slate-950 p-10 text-[9px] leading-tight font-sans min-h-[297mm] flex flex-col box-border overflow-hidden">
      
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

        {/* RESUMO */}
        <div className="mb-6">
            <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-md inline-block min-w-[250px]">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-1">Montante Consolidado</span>
                <p className="text-xl font-black">{currency(totalValue)}</p>
                <p className="text-[7px] text-slate-500 font-bold uppercase mt-1">{transactions.length} registros no período</p>
            </div>
        </div>

        {/* TABELA */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white uppercase font-black text-[7px]">
              <th className="py-2 px-2 text-left border-r border-slate-800">Data</th>
              <th className="py-2 px-2 text-left border-r border-slate-800">Parceiro / Entidade</th>
              <th className="py-2 px-2 text-left border-r border-slate-800">Descrição / Motivo</th>
              <th className="py-2 px-2 text-center border-r border-slate-800">Status</th>
              <th className="py-2 px-2 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="font-bold text-slate-900">
            {transactions.map((tx, idx) => (
              <tr key={tx.id} className={`border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                <td className="py-2.5 px-2">{dateStr(tx.date)}</td>
                <td className="py-2.5 px-2">
                   <p className="font-black uppercase leading-tight">{tx.partnerName}</p>
                   {tab === 'history' && (
                       <p className="text-[6px] text-slate-500 uppercase">{tx.type === 'taken' ? 'Passivo (Recebido)' : 'Ativo (Concedido)'}</p>
                   )}
                </td>
                <td className="py-2.5 px-2 text-slate-600 text-[8px] uppercase leading-tight max-w-[200px]">{tx.description}</td>
                <td className="py-2.5 px-2 text-center">
                   <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase border ${
                       tx.status === 'active' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-slate-200 text-slate-600 border-slate-300'
                   }`}>
                      {tx.status === 'active' ? 'Aberto' : 'Quitado'}
                   </span>
                </td>
                <td className={`py-2.5 px-2 text-right font-black ${tx.type === 'taken' ? 'text-amber-700' : 'text-indigo-700'}`}>
                    {currency(tx.value)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
             <tr className="bg-slate-200 font-black text-slate-950 uppercase text-[8px] border-t-2 border-slate-950">
                <td colSpan={4} className="py-3 px-2 text-right">Soma dos Lançamentos:</td>
                <td className="py-3 px-2 text-right text-lg">{currency(totalValue)}</td>
             </tr>
          </tfoot>
        </table>

        {/* ASSINATURAS */}
        <div className="mt-auto pt-10 border-t border-slate-200">
           <div className="grid grid-cols-2 gap-24 pt-4 text-center">
            <div>
              <div className="border-t-2 border-slate-950 pt-2">
                <p className="font-black text-slate-950 uppercase text-[10px]">{company.razaoSocial}</p>
                <p className="text-[7px] uppercase text-slate-500 font-black tracking-widest mt-1">Conferência Interna</p>
              </div>
            </div>
            <div>
                <div className="border-t-2 border-slate-950 pt-2">
                  <p className="font-black text-slate-950 uppercase text-[10px]">Auditoria Financeira</p>
                  <p className="text-[7px] uppercase text-slate-500 font-black tracking-widest mt-1">Validação de Saldo</p>
                </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center text-[7px] font-black text-slate-400 uppercase tracking-widest">
           <span>Suporte Grãos ERP - Gestão de Antecipações</span>
           <span>Página 1 de 1</span>
        </div>
      </div>
    </div>
  );
};

export default AdvanceListTemplate;
