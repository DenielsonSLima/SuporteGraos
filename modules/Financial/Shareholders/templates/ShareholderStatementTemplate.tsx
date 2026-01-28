
import React from 'react';
import { Shareholder } from '../../../../services/shareholderService';
import { settingsService } from '../../../../services/settingsService';
import { Sprout, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface Props {
  shareholder: Shareholder;
}

const ShareholderStatementTemplate: React.FC<Props> = ({ shareholder }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  // Calculations for the period/statement
  const totalCredits = shareholder.financial.history
    .filter(t => t.type === 'credit')
    .reduce((acc, t) => acc + t.value, 0);

  const totalDebits = shareholder.financial.history
    .filter(t => t.type === 'debit')
    .reduce((acc, t) => acc + t.value, 0);

  return (
    <div id="print-content" className="relative w-full bg-white text-slate-900 p-10 text-xs leading-tight font-sans">
      
      {/* WATERMARK LAYER */}
      {watermark.imageUrl ? (
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <img 
            src={watermark.imageUrl} 
            alt="Marca D'água" 
            className="w-[80%] object-contain transform -rotate-12"
            style={{ opacity: watermark.opacity / 100 }}
          />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
           <Sprout size={400} className="text-slate-200 opacity-20 transform -rotate-12" />
        </div>
      )}

      {/* CONTENT LAYER */}
      <div className="relative z-10 flex flex-col h-full min-h-[950px]">
        
        {/* HEADER */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
          <div className="flex gap-4 items-center">
            {/* Logo */}
            <div className="w-16 h-16 bg-slate-100 flex items-center justify-center rounded border border-slate-200 overflow-hidden">
               {company.logoUrl ? (
                 <img src={company.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
               ) : (
                 <Sprout size={28} className="text-slate-400" />
               )}
            </div>
            {/* Company Data */}
            <div>
              <h1 className="text-lg font-bold uppercase tracking-wide text-slate-900">{company.razaoSocial}</h1>
              <div className="text-slate-600 space-y-0.5 text-[9px] mt-1">
                <p>{company.endereco}, {company.numero} - {company.bairro}</p>
                <p>{company.cidade}/{company.uf} - CEP: {company.cep}</p>
                <p>CNPJ: {company.cnpj} {company.ie && `| IE: ${company.ie}`}</p>
                <p>{company.telefone} | {company.email}</p>
                {company.site && <p>{company.site}</p>}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <h2 className="text-2xl font-bold text-slate-800 uppercase">Extrato de Sócio</h2>
            <p className="mt-1 font-medium">{shareholder.name}</p>
            <p className="text-slate-500">CPF: {shareholder.cpf}</p>
            <p className="text-slate-400 mt-1">Emissão: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* 1. RESUMO FINANCEIRO */}
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mb-8">
          <h3 className="font-bold text-sm uppercase mb-4 text-slate-700 border-b border-slate-200 pb-2">
            Resumo da Conta Corrente
          </h3>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Total de Créditos</p>
              <div className="flex items-center gap-2 text-emerald-600">
                <ArrowUpCircle size={16} />
                <span className="text-lg font-bold">{currency(totalCredits)}</span>
              </div>
              <p className="text-[9px] text-slate-400">Pro-labores e aportes</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Total de Retiradas</p>
              <div className="flex items-center gap-2 text-rose-600">
                <ArrowDownCircle size={16} />
                <span className="text-lg font-bold">{currency(totalDebits)}</span>
              </div>
              <p className="text-[9px] text-slate-400">Saídas e pagamentos</p>
            </div>
            <div className="border-l border-slate-200 pl-6">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Saldo Atual Disponível</p>
              <span className={`text-2xl font-bold ${shareholder.financial.currentBalance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                {currency(shareholder.financial.currentBalance)}
              </span>
            </div>
          </div>
        </div>

        {/* 2. HISTÓRICO DETALHADO */}
        <div className="mb-4">
          <h3 className="font-bold text-sm uppercase mb-2 border-b border-slate-800 pb-1">
            Detalhamento de Movimentações
          </h3>
          
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-left">
                <th className="py-2 px-3 font-bold text-slate-600">Data</th>
                <th className="py-2 px-3 font-bold text-slate-600">Descrição</th>
                <th className="py-2 px-3 font-bold text-slate-600 text-center">Tipo</th>
                <th className="py-2 px-3 font-bold text-slate-600 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {shareholder.financial.history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 italic bg-slate-50">
                    Nenhuma movimentação registrada.
                  </td>
                </tr>
              ) : (
                shareholder.financial.history.map((item, idx) => (
                  <tr key={item.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="py-2 px-3">{date(item.date)}</td>
                    <td className="py-2 px-3 font-medium text-slate-700">{item.description}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${item.type === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {item.type === 'credit' ? 'Crédito' : 'Débito'}
                      </span>
                    </td>
                    <td className={`py-2 px-3 text-right font-bold ${item.type === 'credit' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {item.type === 'debit' ? '-' : '+'}{currency(item.value)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 3. RODAPÉ */}
        <div className="mt-auto pt-10">
          <div className="border border-slate-300 rounded p-2 mb-8 min-h-[50px]">
            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Observações</p>
            <p className="text-xs text-slate-600">
              Este documento demonstra a posição financeira do sócio junto à empresa na data de emissão.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12">
            <div className="text-center">
              <div className="border-t border-slate-400 pt-2 mb-1"></div>
              <p className="font-bold">{company.razaoSocial}</p>
              <p className="text-[10px] text-slate-500">Departamento Financeiro</p>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-400 pt-2 mb-1"></div>
              <p className="font-bold">{shareholder.name}</p>
              <p className="text-[10px] text-slate-500">Sócio</p>
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-slate-200 text-[9px] text-slate-400 flex justify-between items-center">
            <span>Sistema ERP Suporte Grãos - Documento gerado eletronicamente em {new Date().toLocaleString()}</span>
            <span>Página 1 de 1</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ShareholderStatementTemplate;
