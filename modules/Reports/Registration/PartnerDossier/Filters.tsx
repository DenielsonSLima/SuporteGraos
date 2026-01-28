
import React, { useState, useEffect } from 'react';
import { User, Search } from 'lucide-react';
import { partnerService } from '../../../../services/partnerService';
import { Partner } from '../../../../modules/Partners/types';

interface Props {
  filters: any;
  onChange: (newFilters: any) => void;
}

const Filters: React.FC<Props> = ({ filters, onChange }) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setPartners(partnerService.getAll());
  }, []);

  const filteredPartners = partners.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.document.includes(search)
  );

  return (
    <div className="space-y-5 animate-in slide-in-from-left-2">
      <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800">
        Para gerar o dossiê, selecione um parceiro específico na lista abaixo.
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Buscar Parceiro</label>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Digite para filtrar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white text-slate-900"
          />
        </div>
        
        <div className="border border-slate-200 rounded-lg max-h-60 overflow-y-auto bg-white">
          {filteredPartners.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400">Nenhum parceiro encontrado</div>
          )}
          {filteredPartners.map(p => (
            <button
              key={p.id}
              onClick={() => onChange({ partnerId: p.id })}
              className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors flex items-center gap-3 ${filters.partnerId === p.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
            >
              <div className="bg-slate-100 p-2 rounded-full text-slate-500">
                <User size={16} />
              </div>
              <div>
                <p className="font-bold text-slate-700 text-sm">{p.name}</p>
                <p className="text-xs text-slate-400">{p.document}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Filters;
