
import React from 'react';
import { FinancialRecord } from '../../types';
import { settingsService } from '../../../../services/settingsService';
import { Sprout } from 'lucide-react';

interface Props {
  records: FinancialRecord[];
  groupBy: 'none' | 'month' | 'entity';
  filters: {
    startDate: string;
    endDate: string;
    category: string;
    bank: string;
  };
}

const FinancialHistoryTemplate: React.FC<Props> = ({ records, groupBy, filters }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  // Totals
  const totalIn = records.filter(r => ['sales_order', 'loan_granted', 'receipt'].includes(r.subType || '')).reduce((acc, r) => acc + r.paidValue, 0);
  const totalOut = records.filter(r => !['sales_order', 'loan_granted', 'receipt'].includes(r.subType || '')).reduce((acc, r) => acc + r.paidValue, 0);
  const balance = totalIn - totalOut;

  // Grouping Logic for PDF
  const renderContent = () => {
    if (groupBy === 'none') {
      return renderTable(records);
    }

    const groups: Record<string, FinancialRecord[]> = {};
    records.forEach(r => {
      let key = '';
      if (groupBy === 'month') {
        key = new Date(r.dueDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      } else {
        key = r.entityName || 'Sem Parceiro';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    return Object.keys(groups).map(key => {
      const groupRecords = groups[key];
      const groupTotal = groupRecords.reduce((acc, r) => {
        const isCredit = ['sales_order', 'loan_granted', 'receipt'].includes(r.subType || '');
        return acc + (isCredit ? r.paidValue : -r.paidValue);
      }, 0);

      return (
        <div key={key} className="mb-6 break-inside-avoid">
          <div className="flex justify-between items-center bg-slate-200 px-3 py-1.5 border-b border-slate-400">
            <h3 className="font-bold text-sm uppercase text-black">{key}</h3>
            <span className={`text-xs font-bold ${groupTotal >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
              Saldo: {currency(groupTotal)}
            </span>
          </div>
          {renderTable(groupRecords)}
        </div>
      );
    });
  };

  const renderTable = (data: FinancialRecord[]) => (
    <table className="w-full border-collapse text-[10px]">
      <thead>
        <tr className="border-b border-slate-400 text-left text-black bg-slate-50">
          <th className="py-1 px-2 w-20 font-bold">Data</th>
          <th className="py-1 px-2 font-bold">Descrição / Entidade</th>
          <th className="py-1 px-2 font-bold">Categoria</th>
          <th className="py-1 px-2 text-right font-bold">Valor Original</th>
          <th className="py-1 px-2 text-right font-bold">Pago/Recebido</th>
        </tr>
      </thead>
      <tbody>
        {data.map((r, idx) => {
          const isCredit = ['sales_order', 'loan_granted', 'receipt'].includes(r.subType || '');
          return (
            <tr key={r.id} className={`border-b border-slate-300 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
              <td className="py-1 px-2 text-slate-800">{date(r.issueDate)}</td>
              <td className="py-1 px-2">
                <span className="font-bold block text-black">{r.description}</span>
                <span className="text-slate-600">{r.entityName}</span>
              </td>
              <td className="py-1 px-2 text-slate-800">{r.category}</td>
              <td className="py-1 px-2 text-right text-slate-600">{currency(r.originalValue)}</td>
              <td className={`py-1 px-2 text-right font-bold ${isCredit ? 'text-emerald-800' : 'text-rose-800'}`}>
                {isCredit ? '+' : '-'}{currency(r.paidValue)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div id="print-content" className="relative w-full bg-white text-black p-10 text-xs leading-tight font-sans">
      
      {/* WATERMARK */}
      {watermark.imageUrl ? (
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <img 
            src={watermark.imageUrl} 
            className="w-[80%] object-contain transform -rotate-12" 
            style={{ opacity: watermark.opacity / 100 }}
          />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
           <Sprout size={400} className="text-slate-200 opacity-20 transform -rotate-12" />
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full min-h-[950px]">
        {/* HEADER */}
        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
          <div className="flex gap-4 items-center">
            <div className="w-16 h-16 bg-white flex items-center justify-center rounded border border-slate-300 overflow-hidden">
               {company.logoUrl ? (
                 <img src={company.logoUrl} className="max-w-full max-h-full object-contain" />
               ) : (
                 <Sprout size={28} className="text-slate-400" />
               )}
            </div>
            <div>
              <h1 className="text-lg font-bold uppercase tracking-wide text-black">{company.razaoSocial}</h1>
              <div className="text-slate-700 space-y-0.5 text-[9px] mt-1 font-medium">
                <p>{company.endereco}, {company.numero} - {company.bairro}</p>
                <p>{company.cidade}/{company.uf} - CEP: {company.cep}</p>
                <p>CNPJ: {company.cnpj} {company.ie && `| IE: ${company.ie}`}</p>
                <p>{company.telefone} | {company.email}</p>
                {company.site && <p>{company.site}</p>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-black uppercase">Relatório Financeiro</h2>
            <p className="text-slate-700 mt-1 font-medium">Emissão: {new Date().toLocaleString()}</p>
            {filters.startDate && filters.endDate && (
              <p className="text-[10px] font-bold mt-1 text-black">Período: {date(filters.startDate)} a {date(filters.endDate)}</p>
            )}
          </div>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-3 gap-4 mb-8 bg-slate-100 p-4 rounded border border-slate-300">
          <div className="text-center">
            <p className="uppercase text-[10px] text-slate-600 font-bold">Total Entradas</p>
            <p className="text-lg font-bold text-emerald-700">{currency(totalIn)}</p>
          </div>
          <div className="text-center border-l border-slate-400">
            <p className="uppercase text-[10px] text-slate-600 font-bold">Total Saídas</p>
            <p className="text-lg font-bold text-rose-700">{currency(totalOut)}</p>
          </div>
          <div className="text-center border-l border-slate-400">
            <p className="uppercase text-[10px] text-slate-600 font-bold">Saldo do Período</p>
            <p className={`text-xl font-bold ${balance >= 0 ? 'text-black' : 'text-red-700'}`}>{currency(balance)}</p>
          </div>
        </div>

        {/* DATA */}
        <div>
          {renderContent()}
        </div>

        {/* FOOTER */}
        <div className="mt-auto pt-8 border-t border-slate-400 text-[10px] text-slate-600 flex justify-between">
          <span>{company.nomeFantasia} - Sistema Integrado</span>
          <span>Página 1 de 1</span>
        </div>
      </div>
    </div>
  );
};

export default FinancialHistoryTemplate;
