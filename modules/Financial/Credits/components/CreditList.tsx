import React from 'react';
import { Calendar, Edit2, Trash2, Landmark } from 'lucide-react';
import { FinancialRecord } from '../../types';
import { useAccounts } from '../../../../hooks/useAccounts';

interface CreditListProps {
  credits: FinancialRecord[];
  onEdit: (credit: FinancialRecord) => void;
  onDelete: (credit: FinancialRecord) => void;
}

const formatDate = (dateString?: string) => {
  if (!dateString) return '---';
  try {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(dateString));
  } catch (e) {
    return 'Data Inválida';
  }
};

const CreditList: React.FC<CreditListProps> = ({ credits, onEdit, onDelete }) => {
  const { data: accounts = [] } = useAccounts();
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  const getAccountLabel = (accountId?: string) => {
    if (!accountId) return 'Sem conta';
    const account = accounts.find(a => a.id === accountId);
    return account ? account.account_name : 'Sem conta';
  };

  const sortedCredits = [...credits].sort((a, b) =>
    new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
  );

  if (credits.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
        Nenhum crédito registrado neste período.
      </div>
    );
  }

  const monthLabel = (dateValue: string) => {
    try {
      return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(dateValue));
    } catch { return 'Data desconhecida'; }
  };

  // Group by month
  const groupedByMonth: Record<string, FinancialRecord[]> = {};
  sortedCredits.forEach((credit) => {
    try {
      const d = new Date(credit.issueDate || credit.dueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groupedByMonth[key]) groupedByMonth[key] = [];
      groupedByMonth[key].push(credit);
    } catch {
      if (!groupedByMonth['unknown']) groupedByMonth['unknown'] = [];
      groupedByMonth['unknown'].push(credit);
    }
  });

  const monthKeys = Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a));

  const renderTable = (rows: FinancialRecord[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[11px] text-slate-600 whitespace-nowrap border-collapse">
        <thead className="bg-slate-900 text-white font-black uppercase tracking-tighter">
          <tr>
            <th className="px-4 py-3 border-r border-slate-800 w-36">Data</th>
            <th className="px-4 py-3 border-r border-slate-800">Descrição</th>
            <th className="px-4 py-3 border-r border-slate-800 w-52">Conta Bancária</th>
            <th className="px-4 py-3 text-right border-r border-slate-800 w-36">Valor</th>
            <th className="px-4 py-3 text-center w-32">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(credit => (
            <tr
              key={credit.id}
              className="hover:bg-slate-50 transition-colors group"
            >
              <td className="px-4 py-4 font-black text-slate-900">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <span>
                    {formatDate(credit.issueDate || credit.dueDate)}
                  </span>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="font-bold text-blue-600 uppercase">{credit.description || '-'}</div>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-1.5 font-bold text-indigo-600">
                  <Landmark size={12} className="text-slate-400" />
                  {getAccountLabel(credit.bankAccount)}
                </div>
              </td>
              <td className="px-4 py-4 text-right font-black text-emerald-600">
                {currency(credit.originalValue || 0)}
              </td>
              <td className="px-4 py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(credit);
                    }}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-all active:scale-95"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(credit);
                    }}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-rose-600 transition-all active:scale-95"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      {monthKeys.map((monthKey) => {
        const rows = groupedByMonth[monthKey];
        const header = monthKey === 'unknown' ? 'Data desconhecida' : monthLabel(rows[0].issueDate || rows[0].dueDate);
        return (
          <div key={monthKey} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
              <div className="text-sm font-bold text-slate-700 capitalize">{header}</div>
            </div>
            {renderTable(rows)}
          </div>
        );
      })}
    </div>
  );
};

export default CreditList;
