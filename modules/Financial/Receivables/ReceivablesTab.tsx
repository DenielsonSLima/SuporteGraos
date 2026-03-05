
import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Layers, Filter, Calendar, X, Search } from 'lucide-react';
import UnifiedReceivableManager from './components/UnifiedReceivableManager';
import { FinancialRecord } from '../types';
import { useReceivables } from '../../../hooks/useFinancialEntries';
import type { EnrichedReceivableEntry } from '../../../services/financialEntriesService';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../hooks/queryKeys';

// ============================================================================
// Adaptador: EnrichedReceivableEntry (VIEW SQL) → FinancialRecord (UI)
// Zero cálculo no frontend — tudo vem pronto do banco de dados
// ============================================================================
const toFinancialRecord = (entry: EnrichedReceivableEntry): FinancialRecord => {
  const status = entry.status === 'paid' ? 'paid'
    : entry.status === 'partially_paid' ? 'partial'
    : entry.status === 'overdue' ? 'overdue'
    : 'pending';

  // Dados vindos do SQL (partner_name já resolvido pela VIEW)
  const partnerName = entry.partner_name;

  return {
    id: entry.id,
    originId: entry.origin_id,
    description: partnerName,
    entityName: partnerName,
    category: 'Vendas',
    dueDate: entry.due_date || entry.created_date,
    issueDate: entry.created_date,
    originalValue: entry.total_amount,
    paidValue: entry.paid_amount,
    remainingValue: entry.remaining_amount,
    status,
    subType: 'sales_order',
    weightKg: entry.loading_weight_kg,
    totalTon: entry.loading_weight_ton,
    totalSc: entry.loading_weight_sc,
    unitPriceSc: entry.unit_price_sc,
    orderNumber: entry.sales_order_number,
  };
};

const ReceivablesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'open' | 'all'>('open');

  // Filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const PAGE_SIZE = 100;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // TanStack Query: dados + realtime automático (VIEW já vem enriquecida)
  const { data: rawReceivables = [], isLoading: loading } = useReceivables();
  const records = useMemo(() => rawReceivables.map(toFinancialRecord), [rawReceivables]);

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_RECEIVABLES });
  };

  const filteredRecords = useMemo(() => {
    let result = records;

    // Filtro por status
    if (activeSubTab === 'open') {
      result = result.filter(r => r.status !== 'paid');
    }

    // Filtro por termo E período (apenas aba Visão Geral)
    if (activeSubTab === 'all') {
      if (startDate || endDate || searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        result = result.filter(r => {
          // Filtragem Data
          const d = r.dueDate || r.issueDate || '';
          if (startDate && d < startDate) return false;
          if (endDate && d > endDate) return false;

          // Filtragem Texto
          if (searchTerm) {
            return r.entityName.toLowerCase().includes(searchLower) ||
              r.description.toLowerCase().includes(searchLower);
          }
          return true;
        });
      }
    }

    return result;
  }, [records, activeSubTab, startDate, endDate, searchTerm]);

  // Paginação (apenas Visão Geral)
  const paginatedRecords = useMemo(() => {
    if (activeSubTab !== 'all') return filteredRecords;
    return filteredRecords.slice(0, visibleCount);
  }, [filteredRecords, activeSubTab, visibleCount]);

  const hasMore = activeSubTab === 'all' && filteredRecords.length > visibleCount;

  // Reset paginação quando filtro muda
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [startDate, endDate, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit shadow-inner">
          <button
            onClick={() => setActiveSubTab('open')}
            className={`flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeSubTab === 'open' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <Filter size={16} />
            Em Aberto
          </button>
          <button
            onClick={() => setActiveSubTab('all')}
            className={`flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeSubTab === 'all' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <Layers size={16} />
            Visão Geral (Todos)
          </button>
        </div>


      </div>

      <div className="bg-white p-2 rounded-3xl border border-slate-200 shadow-sm">
        {/* Busca e Filtro Unificado (apenas Visão Geral) */}
        {activeSubTab === 'all' && (
          <div className="px-4 pt-4 pb-2">
            <div className="bg-slate-50 p-2 md:p-3 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-3 items-center">

              {/* Busca Global */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar histórico completo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:border-emerald-500 focus:ring-0 outline-none transition-all font-bold"
                />
              </div>

              {/* Filtro de Data ao lado */}
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 w-full md:w-auto overflow-x-auto">
                <Calendar size={16} className="text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-32 text-xs border-none focus:ring-0 bg-transparent text-slate-600 font-bold p-0"
                />
                <span className="text-slate-300 font-bold text-xs">até</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-32 text-xs border-none focus:ring-0 bg-transparent text-slate-600 font-bold p-0"
                />
                {(startDate || endDate) && (
                  <button
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="ml-2 hover:bg-slate-100 p-1 rounded-full text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

            </div>

            {/* Contador de Filtro */}
            {(startDate || endDate || searchTerm) && (
              <div className="px-2 mt-2 text-right">
                <span className="text-xs font-bold text-slate-400">
                  {filteredRecords.length} registro{filteredRecords.length !== 1 ? 's' : ''} encontrado{filteredRecords.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}

        <UnifiedReceivableManager
          records={paginatedRecords}
          onRefresh={refreshData}
          viewMode={activeSubTab}
          searchTerm={activeSubTab === 'all' ? searchTerm : undefined}
          hideSearchBar={activeSubTab === 'all'}
        />

        {/* Paginação (apenas Visão Geral) */}
        {activeSubTab === 'all' && filteredRecords.length > 0 && (
          <div className="flex flex-col items-center gap-2 py-4">
            <span className="text-xs font-bold text-slate-400">Exibindo {paginatedRecords.length} de {filteredRecords.length} registros</span>
            {hasMore && (
              <button
                onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                className="px-6 py-2 rounded-lg text-sm font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Carregar mais
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceivablesTab;
