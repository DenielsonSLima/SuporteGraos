import React from 'react';
import { Asset } from '../types';
import { settingsService } from '../../../services/settingsService';
// Added Info to imports from lucide-react
import { Sprout, Tractor, DollarSign, Calendar, Scale, PackageCheck, AlertTriangle, Info } from 'lucide-react';

interface Props {
  assets: Asset[];
  financialRecords: any[];
}

const AssetListPdfTemplate: React.FC<Props> = ({ assets, financialRecords }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const dateStr = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  // --- CÁLCULOS CONSOLIDADOS ---
  const activeAssets = assets.filter(a => a.status === 'active');
  const soldAssets = assets.filter(a => a.status === 'sold');
  const offAssets = assets.filter(a => a.status === 'write_off');

  const totalFixedValue = activeAssets.reduce((acc, a) => acc + a.acquisitionValue, 0);
  const totalSalesValue = soldAssets.reduce((acc, a) => acc + (a.saleValue || 0), 0);
  
  const totalReceived = financialRecords
    .filter(r => r.category === 'Venda de Ativo' && r.assetId)
    .reduce((acc, r) => acc + r.paidValue, 0);

  const totalPending = Math.max(0, totalSalesValue - totalReceived);

  return (
    <div className="relative w-full bg-white text-slate-950 p-12 text-[10px] leading-tight font-sans min-h-[297mm] flex flex-col box-border overflow-hidden">
      
      {/* MARCA D'ÁGUA */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {watermark.imageUrl ? (
          <img 
            src={watermark.imageUrl} 
            className="w-[75%] object-contain"
            style={{ opacity: watermark.opacity / 100 }}
          />
        ) : (
          <Sprout size={400} className="text-slate-100 opacity-10" />
        )}
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        {/* HEADER */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
          <div className="flex gap-6 items-center">
            <div className="h-20 w-auto flex items-center justify-center shrink-0">
               {company.logoUrl ? <img src={company.logoUrl} className="max-h-full w-auto object-contain" /> : <Sprout size={48} className="text-slate-300" />}
            </div>
            <div>
              <h1 className="text-xl font-black uppercase text-slate-900">{company.razaoSocial}</h1>
              <div className="text-slate-700 text-[9px] mt-1 space-y-0.5 font-bold uppercase">
                <p>CNPJ: {company.cnpj} | {company.telefone}</p>
                <p>{company.cidade}/{company.uf} - {company.endereco}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Inventário de Ativos</h2>
            <p className="text-[10px] font-black text-blue-700 uppercase mt-2 tracking-widest border-b border-blue-100 pb-1">Relatório Consolidado de Patrimônio</p>
            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>

        {/* DASHBOARD DE PATRIMÔNIO */}
        <div className="grid grid-cols-4 gap-4 mb-10">
           <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md border border-slate-800">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-1">Patrimônio Imobilizado</span>
              <p className="text-base font-black text-white">{currency(totalFixedValue)}</p>
              <p className="text-[7px] text-slate-500 font-bold mt-1">{activeAssets.length} itens em uso</p>
           </div>
           <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
              <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Total de Vendas</span>
              <p className="text-base font-black text-emerald-800">{currency(totalSalesValue)}</p>
              <p className="text-[7px] text-emerald-600 font-bold mt-1">{soldAssets.length} bens alienados</p>
           </div>
           <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl">
              <span className="text-[7px] font-black text-blue-600 uppercase tracking-widest block mb-1">Total Já Recebido</span>
              <p className="text-base font-black text-blue-800">{currency(totalReceived)}</p>
              <p className="text-[7px] text-blue-500 font-bold mt-1">Liquidez Efetiva</p>
           </div>
           <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-center">
              <span className="text-[7px] font-black text-rose-600 uppercase tracking-widest block mb-1">Saldo a Receber</span>
              <p className="text-base font-black text-rose-800">{currency(totalPending)}</p>
              <p className="text-[7px] text-rose-500 font-bold mt-1">Créditos de Desinvestimento</p>
           </div>
        </div>

        {/* TABELA DE ITENS */}
        <div className="mb-8">
           <h3 className="font-black text-slate-950 uppercase text-xs mb-3 border-b-2 border-slate-900 pb-1">Relação Completa de Bens e Equipamentos</h3>
           <table className="w-full border-collapse text-[9px]">
             <thead>
               <tr className="bg-slate-100 text-slate-500 uppercase font-black border-y border-slate-200">
                 <th className="py-2 px-3 text-left">Identificação do Bem</th>
                 <th className="py-2 px-3 text-center">Tipo</th>
                 <th className="py-2 px-3 text-center">Aquisição</th>
                 <th className="py-2 px-3 text-right">Valor Custo</th>
                 <th className="py-2 px-3 text-center">Status</th>
                 <th className="py-2 px-3 text-right">Valor Venda</th>
               </tr>
             </thead>
             <tbody>
               {assets.map((asset, idx) => (
                 <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                   <td className="py-2.5 px-3">
                      <p className="font-black text-slate-900 uppercase">{asset.name}</p>
                      <p className="text-[8px] text-slate-500 font-bold uppercase">{asset.identifier || 'S/N'}</p>
                   </td>
                   <td className="py-2.5 px-3 text-center text-slate-600 uppercase font-bold text-[8px]">{asset.type}</td>
                   <td className="py-2.5 px-3 text-center font-bold text-slate-700">{dateStr(asset.acquisitionDate)}</td>
                   <td className="py-2.5 px-3 text-right font-bold text-slate-900">{currency(asset.acquisitionValue)}</td>
                   <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase border ${
                          asset.status === 'active' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          asset.status === 'sold' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                         {asset.status === 'active' ? 'Em Uso' : asset.status === 'sold' ? 'Vendido' : 'Baixado'}
                      </span>
                   </td>
                   <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                      {asset.status === 'sold' ? currency(asset.saleValue || 0) : '-'}
                   </td>
                 </tr>
               ))}
             </tbody>
             <tfoot>
               <tr className="bg-slate-900 text-white font-black uppercase text-[8px]">
                 <td colSpan={3} className="py-3 px-3 text-right">Totais do Inventário:</td>
                 <td className="py-3 px-3 text-right text-base">{currency(assets.reduce((a,b) => a + b.acquisitionValue, 0))}</td>
                 <td></td>
                 <td className="py-3 px-3 text-right text-base text-emerald-400">{currency(assets.reduce((a,b) => a + (b.saleValue || 0), 0))}</td>
               </tr>
             </tfoot>
           </table>
        </div>

        {/* NOTAS DE AUDITORIA */}
        <div className="mt-auto bg-slate-50 border border-slate-200 rounded-xl p-5 break-inside-avoid">
           <h4 className="text-[9px] font-black uppercase text-slate-400 mb-2 flex items-center gap-2">
              <Info size={12} className="text-blue-500" /> Notas de Auditoria Patrimonial
           </h4>
           <p className="text-[9px] text-slate-600 leading-relaxed font-medium">
             1. O valor de custo representa o montante desembolsado no ato da aquisição.<br/>
             2. Bens vendidos que possuem parcelas em aberto continuam sendo monitorados pelo módulo financeiro através dos registros de 'Venda de Ativo'.<br/>
             3. A exclusão física de itens deste relatório deve ser feita apenas em caso de erro de lançamento.
           </p>
        </div>

        {/* ASSINATURAS */}
        <div className="mt-8 pt-6 border-t-2 border-slate-900">
           <div className="grid grid-cols-2 gap-24 text-center">
             <div>
                <div className="border-t border-slate-300 pt-2">
                  <p className="font-black text-slate-950 uppercase text-[10px]">Responsável pelo Patrimônio</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Conferência e Auditoria</p>
                </div>
             </div>
             <div>
                <div className="border-t border-slate-300 pt-2">
                  <p className="font-black text-slate-950 uppercase text-[10px]">Diretoria Executiva</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Ciência e Aprovação</p>
                </div>
             </div>
           </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center text-[7px] font-black text-slate-400 uppercase tracking-widest">
           <span>Suporte Grãos ERP - Versão 1.2 • Módulo Patrimônio</span>
           <span>Página 1 de 1 • Gerado por: Sistema Integrado</span>
        </div>
      </div>
    </div>
  );
};

export default AssetListPdfTemplate;