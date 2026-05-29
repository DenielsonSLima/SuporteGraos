
import React from 'react';
import { History, Pencil, Trash2 } from 'lucide-react';
import { LoanTransaction } from '../../types';

interface Props {
  history: any[];
  isLoading?: boolean;
  currency: (val: number) => string;
  dateStr: (val: string) => string;
  getBankAccountName: (id?: string, desc?: string) => string;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
}

const LoanHistoryTable: React.FC<Props> = ({ 
  history, isLoading = false, currency, dateStr, getBankAccountName, onEdit, onDelete 
}) => {
  return (
    <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
        <History size={18} className="text-blue-500" />
        <h3 className="font-black uppercase text-xs tracking-widest text-slate-700">Extrato Interno de Movimentações</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <th className="px-6 py-3">Data</th>
              <th className="px-6 py-3">Descrição</th>
              <th className="px-6 py-3">Conta Bancária</th>
              <th className="px-6 py-3 text-right">Valor</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                   <div className="flex flex-col items-center justify-center gap-3">
                      <div className="animate-spin h-6 w-6 text-blue-500 border-2 border-slate-200 border-t-blue-500 rounded-full" />
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">Carregando extrato...</p>
                   </div>
                </td>
              </tr>
            )}
            {!isLoading && history.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                   <div className="flex flex-col items-center gap-2">
                      <History size={40} className="opacity-20" />
                      <p className="text-xs font-black uppercase tracking-widest">Nenhuma movimentação registrada</p>
                      <p className="text-[10px] opacity-60">Os registros aparecerão aqui conforme as parcelas forem pagas ou reforços forem feitos.</p>
                   </div>
                </td>
              </tr>
            )}
            {!isLoading && history.map((record) => {
              const isCredit = record.subType === 'receipt';
              return (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-500 text-[11px]">{dateStr(record.issueDate)}</td>
                  <td className="px-6 py-4 font-bold text-slate-800 text-[11px] leading-tight whitespace-pre-wrap break-words max-w-[280px]">
                    {record.description}
                  </td>
                  <td className="px-6 py-4 text-[10px] text-slate-500 font-bold tracking-tight">
                    {getBankAccountName(record.bankAccount, record.description)}
                  </td>
                  <td className={`px-6 py-4 text-right font-black text-xs ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isCredit ? '+' : '-'}{currency(record.paidValue || record.amount || 0)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!(record.isDisbursement || record.isReversal || record.isReversed || record.description?.startsWith('[ESTORNO]')) && (
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(record)}
                          className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
                          aria-label="Editar lançamento"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(record)}
                          className="p-2 rounded-lg border border-rose-100 text-rose-500 hover:bg-rose-50 transition-colors"
                          aria-label="Excluir lançamento"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LoanHistoryTable;
