import React from 'react';
import { Calendar } from 'lucide-react';
import { FinancialRecord } from '../../types';
import { bankAccountService } from '../../../../services/bankAccountService';

interface Props {
  credits: FinancialRecord[];
  onSelect: (id: string) => void;
}

const CreditList: React.FC<Props> = ({ credits, onSelect }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const dateStr = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const getAccountLabel = (accountId?: string) => {
    if (!accountId) return 'Conta não informada';
    const accounts = bankAccountService.getBankAccounts();
    const account = accounts.find(a => a.id === accountId);
    if (!account) return accountId;
    return `${account.bankName}${account.owner ? ` - ${account.owner}` : ''}`;
  };

  const sortedCredits = [...credits].sort((a, b) =>
    (a.description || '').localeCompare(b.description || '', 'pt-BR')
  );

  if (credits.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
        Nenhum crédito registrado neste período.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400 font-medium">
            <tr>
              <th className="px-5 py-2 w-32">Data</th>
              <th className="px-5 py-2">Descrição</th>
              <th className="px-5 py-2 w-64">Conta</th>
              <th className="px-5 py-2 text-right w-36">Valor</th>
              <th className="px-5 py-2 text-center w-28">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sortedCredits.map(credit => (
              <tr
                key={credit.id}
                onClick={() => onSelect(credit.id)}
                className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                    <span className="text-slate-700 font-medium">
                      {dateStr(credit.issueDate)}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="font-medium text-slate-800">{credit.description || '-'}</div>
                  <div className="text-xs text-slate-500">{credit.entityName || ''}</div>
                </td>
                <td className="px-5 py-3 text-xs">
                  <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">
                    {getAccountLabel(credit.bankAccount)}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-bold text-slate-700">
                  {currency(credit.originalValue || 0)}
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase ${credit.status === 'paid' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-700'}`}>
                    {credit.status === 'paid' ? 'Recebido' : credit.status === 'pending' ? 'Pendente' : 'Parcial'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CreditList;
