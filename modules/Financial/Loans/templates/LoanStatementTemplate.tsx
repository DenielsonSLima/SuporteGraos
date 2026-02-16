
import React from 'react';
import { LoanRecord, FinancialRecord } from '../../types';
import { settingsService } from '../../../../services/settingsService';
import { Sprout, Landmark, Percent, Calendar } from 'lucide-react';

interface Props {
  loan: LoanRecord;
  history: FinancialRecord[];
}

const LoanStatementTemplate: React.FC<Props> = ({ loan, history }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const totalPaid = history.reduce((acc, h) => acc + h.paidValue, 0);

  return (
    <div className="relative w-full bg-white text-slate-900 p-10 text-xs leading-tight font-sans">
      
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
            <h2 className="text-2xl font-bold text-slate-800 uppercase">Extrato de Empréstimo</h2>
            <p className="mt-1 font-medium">Ref: Contrato de {loan.type === 'taken' ? 'Tomada' : 'Concessão'}</p>
            <p className="text-slate-500">Emissão: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* 1. RESUMO DO CONTRATO */}
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mb-8">
          <h3 className="font-bold text-sm uppercase mb-4 text-slate-700 border-b border-slate-200 pb-2">
            Dados do Contrato - {loan.entityName}
          </h3>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Valor Principal</p>
              <div className="flex items-center gap-2">
                <Landmark size={14} className="text-slate-400" />
                <span className="text-base font-bold text-slate-800">{currency(loan.totalValue)}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Taxa de Juros</p>
              <div className="flex items-center gap-2">
                <Percent size={14} className="text-slate-400" />
                <span className="text-base font-bold text-slate-800">{loan.interestRate}% a.m.</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Data Início</p>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-base font-bold text-slate-800">{date(loan.contractDate)}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Saldo Atual</p>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${loan.type === 'taken' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {currency(loan.remainingValue)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. HISTÓRICO */}
        <div className="mb-4">
          <h3 className="font-bold text-sm uppercase mb-2 border-b border-slate-800 pb-1">
            Histórico de Pagamentos e Amortizações
          </h3>
          
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-left">
                <th className="py-2 px-3 font-bold text-slate-600">Data</th>
                <th className="py-2 px-3 font-bold text-slate-600">Descrição / Nota</th>
                <th className="py-2 px-3 font-bold text-slate-600 text-center">Conta</th>
                <th className="py-2 px-3 font-bold text-slate-600 text-right">Valor Pago</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 italic bg-slate-50">
                    Nenhum pagamento registrado até o momento.
                  </td>
                </tr>
              ) : (
                history.map((item, idx) => (
                  <tr key={item.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="py-2 px-3">{date(item.issueDate)}</td>
                    <td className="py-2 px-3">
                      <span className="font-medium">{item.description}</span>
                      {item.notes && <span className="block text-[10px] text-slate-500 italic">{item.notes}</span>}
                    </td>
                    <td className="py-2 px-3 text-center text-slate-500">{item.bankAccount || '-'}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700">
                      {currency(item.paidValue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-200 border-t border-slate-300">
                <td colSpan={3} className="py-2 px-3 text-right font-bold uppercase">Total Amortizado:</td>
                <td className="py-2 px-3 text-right font-bold text-emerald-800">{currency(totalPaid)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 3. RODAPÉ */}
        <div className="mt-auto pt-8">
          <div className="border-t border-slate-300 pt-4 flex justify-between items-center text-[10px] text-slate-400">
            <p>Este documento é um demonstrativo simples para controle interno e não substitui comprovantes bancários oficiais.</p>
            <p>Gerado em {new Date().toLocaleString()}</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoanStatementTemplate;
