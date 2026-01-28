
import React from 'react';
import { Tags, Building2 } from 'lucide-react';
import { DEFAULT_PARTNER_CATEGORIES } from '../../../../constants';

interface Props {
  filters: any;
  onChange: (newFilters: any) => void;
}

const Filters: React.FC<Props> = ({ filters, onChange }) => {
  return (
    <div className="space-y-5 animate-in slide-in-from-left-2">
      
      {/* Type Filter */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Tipo de Pessoa</label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select 
            value={filters.type || ''}
            onChange={(e) => onChange({ type: e.target.value })}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white text-slate-900"
          >
            <option value="">Todos</option>
            <option value="PF">Pessoa Física (CPF)</option>
            <option value="PJ">Pessoa Jurídica (CNPJ)</option>
          </select>
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Categoria</label>
        <div className="relative">
          <Tags className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select 
            value={filters.categoryId || ''}
            onChange={(e) => onChange({ categoryId: e.target.value })}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white text-slate-900"
          >
            <option value="">Todas</option>
            {DEFAULT_PARTNER_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>

    </div>
  );
};

export default Filters;
