// modules/Partners/components/PartnerFilters.tsx
// ============================================================================
// Componente de filtros de parceiros (SKILL §9.4: {Modulo}Filters.tsx)
// Responsabilidade: barra de busca, tabs de categorias, botões de ação
// ============================================================================

import React from 'react';
import { Search, Plus, Printer } from 'lucide-react';
import { PartnerCategory } from '../partners.types';

interface PartnerFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  categories: PartnerCategory[];
  onPrintReport: () => void;
  onAddNew: () => void;
}

const PartnerFilters: React.FC<PartnerFiltersProps> = ({
  searchTerm,
  onSearchChange,
  activeTab,
  onTabChange,
  categories,
  onPrintReport,
  onAddNew
}) => {
  return (
    <>
      {/* Topo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nome, apelido ou documento..."
            className="w-full rounded-2xl border-2 border-slate-100 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 focus:border-primary-500 focus:outline-none transition-all"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onPrintReport}
            className="flex items-center gap-2 rounded-2xl bg-white border-2 border-slate-200 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
          >
            <Printer size={18} /> Relatório Geral
          </button>
          <button
            onClick={onAddNew}
            className="flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-3.5 text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800 shadow-xl transition-all active:scale-95"
          >
            <Plus size={18} /> Novo Parceiro
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto scrollbar-hide">
          <button onClick={() => onTabChange('all')} className={`whitespace-nowrap border-b-4 py-4 px-1 text-sm font-black uppercase tracking-widest transition-colors ${activeTab === 'all' ? 'border-primary-500 text-primary-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Todos</button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => onTabChange(cat.id)} className={`whitespace-nowrap border-b-4 py-4 px-1 text-sm font-black uppercase tracking-widest transition-colors ${activeTab === cat.id ? 'border-primary-500 text-primary-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {cat.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
};

export default PartnerFilters;
