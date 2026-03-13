import React from 'react';
import { Calendar, Wallet } from 'lucide-react';
import { useAccounts } from '../../../../hooks/useAccounts';

interface Props {
  filters: any;
  onChange: (newFilters: any) => void;
}

const Filters: React.FC<Props> = ({ filters, onChange }) => {
  const { data: accounts = [], isLoading } = useAccounts();

  return (
    <div className="space-y-5 animate-in slide-in-from-left-2">

      {/* Date Range */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase">Período de Análise</label>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Início:</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => onChange({ startDate: e.target.value })}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white text-slate-900"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Fim:</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => onChange({ endDate: e.target.value })}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white text-slate-900"
            />
          </div>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* Account Selector */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Conta Bancária</label>
        <div className="relative">
          <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select
            value={filters.accountId || ''}
            onChange={(e) => onChange({ accountId: e.target.value })}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white text-slate-900 disabled:opacity-50"
            disabled={isLoading}
          >
            <option value="">{isLoading ? 'Carregando contas...' : 'Selecione a conta...'}</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.account_name} {acc.owner ? `- ${acc.owner}` : ''}</option>
            ))}
          </select>
        </div>
      </div>

    </div>
  );
};

export default Filters;
