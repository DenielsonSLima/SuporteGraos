import React from 'react';
import { Calendar } from 'lucide-react';

interface Props {
  filters: any;
  onChange: (newFilters: any) => void;
}

const Filters: React.FC<Props> = ({ filters, onChange }) => {
  return (
    <div className="space-y-5 animate-in slide-in-from-left-2">
      {/* Date Range */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Período de Análise</label>
        <div>
          <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase">Data de Início:</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onChange({ startDate: e.target.value })}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white text-slate-900 font-medium"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase">Data de Término:</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onChange({ endDate: e.target.value })}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white text-slate-900 font-medium"
            />
          </div>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <p className="text-[10px] text-blue-700 font-bold leading-tight">
          ℹ️ Este relatório consolida o saldo de todas as contas ativas e projeta a evolução baseada em transações realizadas e títulos pendentes.
        </p>
      </div>
    </div>
  );
};

export default Filters;
