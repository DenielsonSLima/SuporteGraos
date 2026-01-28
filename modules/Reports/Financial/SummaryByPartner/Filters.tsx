
import React, { useState, useEffect } from 'react';
import { Calendar, User, Search } from 'lucide-react';
import { partnerService } from '../../../../services/partnerService';
import { Partner } from '../../../Partners/types';

interface Props {
  filters: any;
  onChange: (newFilters: any) => void;
}

const Filters: React.FC<Props> = ({ filters, onChange }) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setPartners(partnerService.getAll().sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  const filteredPartners = partners.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Período de Vencimento</label>
        <div className="grid gap-2">
            <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => onChange({ startDate: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none"
                />
            </div>
            <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => onChange({ endDate: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none"
                />
            </div>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar Parceiro Específico</label>
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
                type="text"
                placeholder="Pesquisar na lista..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none"
            />
        </div>
        <select 
          value={filters.partnerId || ''}
          onChange={(e) => onChange({ partnerId: e.target.value })}
          className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none bg-white font-bold"
        >
          <option value="">Todos os Parceiros</option>
          {filteredPartners.map(p => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Filters;
