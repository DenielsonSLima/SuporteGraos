
import React from 'react';
import { Asset } from '../types';
import { settingsService } from '../../../services/settingsService';
import { Sprout, Tractor, DollarSign, Calendar, Info, PackageCheck, AlertTriangle, Landmark, User, FileText } from 'lucide-react';

interface Props {
  asset: Asset;
  financialHistory?: any[];
}

const AssetDossierPdfTemplate: React.FC<Props> = ({ asset, financialHistory = [] }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const dateStr = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const isSold = asset.status === 'sold';
  const isWriteOff = asset.status === 'write_off';

  const totalReceived = financialHistory.reduce((acc, h) => acc + h.paidValue, 0);
  const totalOriginal = financialHistory.reduce((acc, h) => acc + h.originalValue, 0);

  return (
    <div className="relative w-full bg-white text-slate-950 p-12 text-[10px] leading-tight font-sans min-h-[297mm] flex flex-col box-border overflow-hidden">
      
      {/* 1. CAMADA DE MARCA D'ÁGUA DINÂMICA - CORRIGIDA (SEM ROTAÇÃO) */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {watermark.imageUrl ? (
          <img 
            src={watermark.imageUrl} 
            alt="Marca D'água" 
            className="w-[75%] object-contain" // Removido o transform -rotate-12
            style={{ opacity: watermark.opacity / 100 }}
          />
        ) : (
          <Sprout size={400} className="text-slate-100 opacity-10" />
        )}
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        {/* CABEÇALHO */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
          <div className="flex gap-6 items-center">
            {/* Logo Transparente */}
            <div className="h-20 w-auto flex items-center justify-center shrink-0 overflow-hidden">
               {company.logoUrl ? (
                 <img src={company.logoUrl} className="max-h-full w-auto object-contain" alt="Logo" />
               ) : (
                 <Sprout size={48} className="text-slate-300" />
               )}
            </div>
            <div>
              <h1 className="text-xl font-black uppercase text-slate-900 leading-none">{company.razaoSocial}</h1>
              <div className="text-slate-700 text-[9px] mt-2 space-y-0.5 font-bold uppercase tracking-tight">
                <p>{company.endereco}, {company.numero} • {company.bairro}</p>
                <p>{company.cidade}/{company.uf} • CEP: {company.cep}</p>
                <p>CNPJ: {company.cnpj} {company.ie && `• IE: ${company.ie}`}</p>
                <p>{company.telefone} • {company.email}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Dossiê de Patrimônio</h2>
            <p className="text-[10px] font-black text-blue-700 uppercase mt-2 tracking-widest border-b border-blue-100 pb-1">
              {isSold ? 'Contrato de Venda de Bem' : isWriteOff ? 'Laudo de Baixa Patrimonial' : 'Ficha de Ativo Imobilizado'}
            </p>
            <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-widest">Emissão: {new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>

        {/* 2. DADOS TÉCNICOS DO BEM */}
        <div className="bg-slate-50 border border-slate-300 rounded-2xl p-6 mb-8 shadow-sm">
          <h3 className="font-black text-slate-950 uppercase text-[9px] mb-4 tracking-widest flex items-center gap-2 border-b border-slate-200 pb-2">
             <Tractor size={14} className="text-blue-600" /> Descritivo do Ativo
          </h3>
          <div className="grid grid-cols-4 gap-8">
            <div className="col-span-2">
              <span className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Nome / Modelo do Bem</span>
              <p className="text-base font-black text-slate-900 uppercase">{asset.name}</p>
            </div>
            <div>
              <span className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Identificador (Placa/Série)</span>
              <p className="text-sm font-black text-slate-700 uppercase">{asset.identifier || 'NÃO INFORMADO'}</p>
            </div>
            <div>
              <span className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Classificação</span>
              <p className="text-sm font-black text-slate-700 uppercase tracking-tighter">{asset.type}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-8 mt-6 pt-4 border-t border-slate-200">
             <div>
               <span className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Valor de Aquisição</span>
               <p className="text-base font-black text-slate-950">{currency(asset.acquisitionValue)}</p>
             </div>
             <div>
               <span className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Data de Entrada</span>
               <p className="text-sm font-black text-slate-900">{dateStr(asset.acquisitionDate)}</p>
             </div>
             <div className="col-span-2">
               <span className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Status Atual do Registro</span>
               <div className="flex items-center gap-2 mt-1">
                    <span className={`px-3 py-0.5 rounded text-[9px] font-black uppercase border ${
                        asset.status === 'active' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        asset.status === 'sold' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                        {asset.status === 'active' ? 'Ativo Imobilizado' : asset.status === 'sold' ? 'Vendido / Liquidando' : 'Baixado (Perda)'}
                    </span>
               </div>
             </div>
          </div>
        </div>

        {/* 3. CONTEXTO DE VENDA (SE APLICÁVEL) */}
        {isSold && (
          <div className="mb-8 border-2 border-emerald-500 rounded-2xl p-6 bg-emerald-50/20 shadow-sm">
            <h3 className="font-black text-emerald-600 uppercase text-[9px] mb-5 tracking-widest flex items-center gap-2 border-b border-emerald-200 pb-2">
               <PackageCheck size={14} /> Dados da Transação de Venda
            </h3>
            <div className="grid grid-cols-3 gap-10">
               <div>
                  <span className="text-[8px] font-bold text-emerald-700 uppercase block mb-1 flex items-center gap-1"><User size={10}/> Comprador / Adquirente</span>
                  <p className="text-sm font-black text-slate-950 uppercase">{asset.buyerName}</p>
               </div>
               <div>
                  <span className="text-[8px] font-bold text-emerald-700 uppercase block mb-1 flex items-center gap-1"><Calendar size={10}/> Data da Operação</span>
                  <p className="text-sm font-black text-slate-900">{asset.saleDate ? dateStr(asset.saleDate) : '-'}</p>
               </div>
               <div className="text-right">
                  <span className="text-[8px] font-bold text-emerald-700 uppercase block mb-1 flex items-center gap-1 justify-end"><DollarSign size={10}/> Valor Negociado</span>
                  <p className="text-xl font-black text-emerald-700">{currency(asset.saleValue || 0)}</p>
               </div>
            </div>

            {/* TABELA DE EXTRATO FINANCEIRO DA VENDA */}
            <div className="mt-8">
                <h4 className="text-[9px] font-black uppercase text-emerald-800 mb-3 flex items-center gap-2">
                    <FileText size={12} /> Extrato de Liquidação das Parcelas
                </h4>
                <table className="w-full text-left text-[9px] border-collapse">
                  <thead>
                    <tr className="bg-emerald-600 text-white uppercase font-black">
                      <th className="py-2 px-3">Vencimento</th>
                      <th className="py-2 px-3">Identificação / Parcela</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3 text-right">V. Parcela</th>
                      <th className="py-2 px-3 text-right">V. Recebido</th>
                      <th className="py-2 px-3">Conta de Recebimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialHistory.length === 0 ? (
                      <tr><td colSpan={6} className="p-10 text-center text-slate-400 italic font-bold">Nenhuma parcela gerada para esta venda.</td></tr>
                    ) : (
                      financialHistory.map((h, i) => (
                        <tr key={i} className={`border-b border-emerald-100 ${h.status === 'paid' ? 'bg-white' : 'bg-slate-50'}`}>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{dateStr(h.dueDate)}</td>
                          <td className="py-2.5 px-3 uppercase text-slate-600">{h.description}</td>
                          <td className="py-2.5 px-3 text-center">
                             <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${
                                 h.status === 'paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                             }`}>
                                {h.status === 'paid' ? 'Liquidado' : 'Aberto'}
                             </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-500">{currency(h.originalValue)}</td>
                          <td className={`py-2.5 px-3 text-right font-black ${h.status === 'paid' ? 'text-emerald-700' : 'text-slate-300'}`}>
                            {currency(h.paidValue)}
                          </td>
                          <td className="py-2.5 px-3">
                             {h.status === 'paid' ? (
                                 <div className="flex items-center gap-1.5 font-black text-indigo-700 uppercase text-[8px]">
                                    <Landmark size={10} className="text-indigo-400" />
                                    {h.bankAccount || 'CAIXA CENTRAL'}
                                 </div>
                             ) : <span className="text-slate-300 italic">Pendente</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-emerald-100 font-black text-emerald-900 uppercase text-[9px]">
                     <tr>
                        <td colSpan={3} className="py-3 px-3 text-right">Consolidado Financeiro:</td>
                        <td className="py-3 px-3 text-right">{currency(totalOriginal)}</td>
                        <td className="py-3 px-3 text-right text-emerald-700 text-base">{currency(totalReceived)}</td>
                        <td className="py-3 px-3 text-right">
                            Saldo em Aberto: {currency(totalOriginal - totalReceived)}
                        </td>
                     </tr>
                  </tfoot>
                </table>
            </div>
          </div>
        )}

        {/* 4. CONTEXTO DE BAIXA (AVARIA/PERDA) */}
        {isWriteOff && (
          <div className="mb-8 border-2 border-rose-500 rounded-2xl p-6 bg-rose-50/20 shadow-sm">
            <h3 className="font-black text-rose-600 uppercase text-[9px] mb-4 tracking-widest flex items-center gap-2 border-b border-rose-200 pb-2">
               <AlertTriangle size={14} /> Detalhes do Laudo de Baixa
            </h3>
            <div className="grid grid-cols-3 gap-6">
               <div>
                  <span className="text-[8px] font-bold text-rose-700 uppercase block mb-1">Data do Evento</span>
                  <p className="text-sm font-black text-slate-900">{asset.writeOffDate ? dateStr(asset.writeOffDate) : '-'}</p>
               </div>
               <div className="col-span-2">
                  <span className="text-[8px] font-bold text-rose-700 uppercase block mb-1">Motivo / Justificativa</span>
                  <p className="text-sm font-black text-slate-950 uppercase">{asset.writeOffReason}</p>
               </div>
            </div>
            <div className="mt-5 p-5 bg-white border border-rose-100 rounded-xl italic text-slate-700 text-[10px] leading-relaxed shadow-inner">
               <span className="font-black uppercase text-[8px] text-slate-400 not-italic block mb-2">Relato do Ocorrido:</span>
               "{asset.writeOffNotes || 'Sem observações detalhadas registradas.'}"
            </div>
          </div>
        )}

        {/* 5. ASSINATURAS E RODAPÉ */}
        <div className="mt-auto pt-10 border-t border-slate-200">
           <div className="grid grid-cols-2 gap-24 pt-4 text-center">
            <div>
              <div className="border-t-2 border-slate-950 pt-3">
                <p className="font-black text-slate-950 uppercase text-xs">{company.razaoSocial}</p>
                <p className="text-[8px] uppercase text-slate-500 font-black tracking-widest mt-1">Conferência e Auditoria Patrimonial</p>
              </div>
            </div>
            <div>
              {isSold && (
                <div className="border-t-2 border-slate-950 pt-3">
                  <p className="font-black text-slate-950 uppercase text-xs">{asset.buyerName}</p>
                  <p className="text-[8px] uppercase text-slate-500 font-black tracking-widest mt-1">Comprador (Ciência e Aceite)</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-4 border-t border-slate-100 flex justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-widest">
           <span>Suporte Grãos ERP - Módulo de Gestão de Bens e Patrimônio</span>
           <span>Documento gerado em {new Date().toLocaleString('pt-BR')} • Página 1 de 1</span>
        </div>
      </div>
    </div>
  );
};

export default AssetDossierPdfTemplate;
