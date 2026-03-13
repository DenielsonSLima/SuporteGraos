import React from 'react';
import { Calendar, Edit2, Trash2 } from 'lucide-react';
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
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-xs uppercase text-slate-400 font-medium">
          <tr>
            <th className="px-5 py-2 w-36">Data</th>
            <th className="px-5 py-2">Descrição</th>
            <th className="px-5 py-2 w-52">Conta</th>
            <th className="px-5 py-2 text-right w-36">Valor</th>
            <th className="px-5 py-2 text-center w-32">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map(credit => (
            <tr
              key={credit.id}
              className="hover:bg-blue-50/30 transition-colors group"
            >
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <span className="text-slate-700 font-medium">
                    {formatDate(credit.issueDate || credit.dueDate)}
                  </span>
                </div>
              </td>
              <td className="px-5 py-3">
                <div className="font-medium text-slate-800">{credit.description || '-'}</div>
              </td>
              <td className="px-5 py-3 text-xs">
                <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-bold">
                  {getAccountLabel(credit.bankAccount)}
                </span>
              </td>
              <td className="px-5 py-3 text-right font-bold text-emerald-600">
                {currency(credit.originalValue || 0)}
              </td>
              <td className="px-5 py-3">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(credit);
                    }}
                    className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(credit);
                    }}
                    className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
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
