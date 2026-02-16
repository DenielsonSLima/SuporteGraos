
import React, { useMemo } from 'react';
import { settingsService } from '../../../services/settingsService';
import { Sprout, TrendingUp, TrendingDown, Users, Wallet } from 'lucide-react';
import { Partner } from '../types';

interface Props {
  partners: Partner[];
  balances: Record<string, { credit: number, debit: number, net: number }>;
}

const AllPartnersSummaryTemplate: React.FC<Props> = ({ partners, balances }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(!val || Math.abs(val) < 0.005 ? 0 : val);

  const totals = useMemo(() => {
    return partners.reduce((acc, p) => {
        const bal = balances[p.id] || { credit: 0, debit: 0, net: 0 };
        return {
            credits: acc.credits + bal.credit,
            debits: acc.debits + bal.debit,
            net: acc.net + bal.net
        };
    }, { credits: 0, debits: 0, net: 0 });
  }, [partners, balances]);

  return (
    <div className="relative w-full bg-white text-slate-900 p-10 text-[9px] leading-tight font-sans min-h-[297mm] flex flex-col box-border overflow-hidden" style={{ width: '800px' }}>
      
      {/* Marca D'água */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
        {watermark.imageUrl ? (
          <img src={watermark.imageUrl} className="w-[60%] object-contain" alt="BG" />
        ) : (
          <Sprout size={350} className="text-slate-100" />
        )}
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
          <div className="flex gap-6 items-center">
            <div className="h-16 w-auto flex items-center shrink-0">
               {company.logoUrl ? <img src={company.logoUrl} className="max-h-full w-auto object-contain" /> : <Sprout size={40} className="text-emerald-500" />}
            </div>
            <div>
              <h1 className="text-base font-black uppercase text-slate-900 leading-none">{company.razaoSocial}</h1>
              <p className="text-[8px] font-black text-slate-400 uppercase mt-1 tracking-widest">Consolidado Financeiro de Parceiros Comerciais</p>
              <p className="text-[7px] text-slate-500 mt-1 uppercase font-bold">CNPJ: {company.cnpj} | {company.cidade}/{company.uf}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-black text-slate-950 uppercase italic tracking-tighter">RELATÓRIO GERAL DE SALDOS</h2>
            <p className="text-[7px] text-slate-400 font-bold uppercase mt-2">Emissão: {new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>

        {/* Dashboards de Totais */}
        <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl shadow-sm">
                <span className="text-[8px] font-black text-emerald-600 uppercase mb-1 block">Total Geral a Receber</span>
                <p className="text-lg font-black text-emerald-700">{currency(totals.credits)}</p>
            </div>
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl shadow-sm">
                <span className="text-[8px] font-black text-rose-600 uppercase mb-1 block">Total Geral a Pagar</span>
                <p className="text-lg font-black text-rose-700">{currency(totals.debits)}</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-2xl shadow-lg flex flex-col justify-center text-white border-2 border-slate-700">
                <span className="text-[8px] font-black uppercase text-slate-400 mb-1 block">Saldo Líquido da Base</span>
                <p className={`text-lg font-black ${totals.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{currency(totals.net)}</p>
            </div>
        </div>

        {/* Tabela Principal */}
        <div className="flex-1">
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase text-[7px] tracking-widest">
                        <th className="py-3 px-3 text-left rounded-tl-xl w-[30%]">Nome / Razão Social</th>
                        <th className="py-3 px-3 text-left w-[20%]">Documento</th>
                        <th className="py-3 px-3 text-right w-[17%]">Receber</th>
                        <th className="py-3 px-3 text-right w-[17%]">Pagar</th>
                        <th className="py-3 px-3 text-right rounded-tr-xl w-[16%]">Saldo</th>
                    </tr>
                </thead>
                <tbody className="text-[8px] font-bold">
                    {partners.map((p, idx) => {
                        const bal = balances[p.id] || { credit: 0, debit: 0, net: 0 };
                        return (
                            <tr key={p.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                <td className="py-2 px-3 text-slate-900 uppercase truncate" title={p.name}>{p.name}</td>
                                <td className="py-2 px-3 font-mono text-slate-500">{p.document}</td>
                                <td className="py-2 px-3 text-right text-emerald-700">{currency(bal.credit)}</td>
                                <td className="py-2 px-3 text-right text-rose-700">{currency(bal.debit)}</td>
                                <td className={`py-2 px-3 text-right font-black ${bal.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {currency(bal.net)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-900 font-black text-slate-900 uppercase italic">
                        <td colSpan={2} className="py-4 px-3 text-right text-[10px]" style={{ width: '50%' }}>SOMATÓRIA CONSOLIDADA:</td>
                        {/* Fonte reduzida para 7.5px e tracking tighter para suportar milhões */}
                        <td className="py-4 px-1 text-right text-emerald-700 whitespace-nowrap text-[7.5px] tracking-tighter" style={{ width: '17%' }}>{currency(totals.credits)}</td>
                        <td className="py-4 px-1 text-right text-rose-700 whitespace-nowrap text-[7.5px] tracking-tighter" style={{ width: '17%' }}>{currency(totals.debits)}</td>
                        <td className="py-4 px-2 text-right text-[11px] tracking-tighter whitespace-nowrap" style={{ width: '16%' }}>{currency(totals.net)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        {/* Rodapé */}
        <div className="mt-10 pt-4 border-t border-slate-200 flex justify-between items-center text-[7px] font-black text-slate-400 uppercase tracking-widest">
           <div className="flex gap-4">
              <span className="flex items-center gap-1"><Sprout size={10} className="text-emerald-500" /> Suporte Grãos Intelligence</span>
              <span>Documento de Conferência de Saldos Globais</span>
           </div>
           <span>Página 1 de 1</span>
        </div>
      </div>
    </div>
  );
};

export default AllPartnersSummaryTemplate;
