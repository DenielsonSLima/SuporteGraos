
import React from 'react';
import { Calendar, Search } from 'lucide-react';

interface Props {
  filters: any;
  onChange: (newFilters: any) => void;
}

const Filters: React.FC<Props> = ({ filters, onChange }) => {
  return (
    <div className="space-y-5 animate-in slide-in-from-left-2">
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase">Período de Registro</label>
        <div>
          <label className="block text-xs text-slate-500 mb-1">De:</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="date"
              value={filters.startDate}
              onChange={(e) => onChange({ startDate: e.target.value })}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500 bg-white text-slate-900"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Até:</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="date"
              value={filters.endDate}
              onChange={(e) => onChange({ endDate: e.target.value })}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500 bg-white text-slate-900"
            />
          </div>
        </div>
      </div>

      <hr className="border-slate-100" />

      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Filtrar por Parceiro</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Nome do parceiro..."
            value={filters.partnerName || ''}
            onChange={(e) => onChange({ partnerName: e.target.value })}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500 bg-white text-slate-900"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Tipo de Operação</label>
        <select 
          value={filters.type || ''}
          onChange={(e) => onChange({ type: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500 bg-white text-slate-900"
        >
          <option value="">Todos</option>
          <option value="given">Concedidos (Ativos)</option>
          <option value="taken">Recebidos (Passivos)</option>
        </select>
      </div>
    </div>
  );
};

export default Filters;
