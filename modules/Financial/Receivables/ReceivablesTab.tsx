
import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Layers, Filter, Calendar, X, Search } from 'lucide-react';
import UnifiedReceivableManager from './components/UnifiedReceivableManager';
import { FinancialRecord } from '../types';
import { useReceivables } from '../../../hooks/useFinancialEntries';
import type { EnrichedReceivableEntry } from '../../../services/financialEntriesService';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../hooks/queryKeys';

const toFinancialRecord = (entry: EnrichedReceivableEntry): FinancialRecord => {
  const status = entry.status === 'paid' ? 'paid'
    : entry.status === 'partially_paid' ? 'partial'
      : entry.status === 'overdue' ? 'overdue'
        : entry.status === 'cancelled' ? 'cancelled'
          : entry.status === 'reversed' ? 'reversed'
            : 'pending';

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
    deductionsAmount: entry.deductions_amount,
    netAmount: entry.net_amount,
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

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const PAGE_SIZE = 100;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data: rawReceivables = [], isLoading: loading } = useReceivables();
  const records = useMemo(() => rawReceivables.map(toFinancialRecord), [rawReceivables]);



  const filteredRecords = useMemo(() => {
    let result = records;
    if (activeSubTab === 'open') {
      result = result.filter(r => r.status !== 'paid');
    }

    if (activeSubTab === 'all') {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(r => {
        const d = r.dueDate || r.issueDate || '';
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        if (searchTerm) {
          return r.entityName.toLowerCase().includes(searchLower) ||
            r.description.toLowerCase().includes(searchLower);
        }
        return true;
      });
    }
    return result;
  }, [records, activeSubTab, startDate, endDate, searchTerm]);

  const paginatedRecords = useMemo(() => {
    if (activeSubTab !== 'all') return filteredRecords;
    return filteredRecords.slice(0, visibleCount);
  }, [filteredRecords, activeSubTab, visibleCount]);

  const hasMore = activeSubTab === 'all' && filteredRecords.length > visibleCount;

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [startDate, endDate, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Premium Sub-navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex gap-2 p-1.5 bg-slate-100/80 backdrop-blur-md rounded-2xl border border-slate-200/50 shadow-inner w-full sm:w-fit">
          <button
            onClick={() => setActiveSubTab('open')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all duration-300 ${activeSubTab === 'open' ? 'bg-white text-emerald-600 shadow-xl shadow-emerald-900/5' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
          >
            <Filter size={16} /> Em Aberto
          </button>
          <button
            onClick={() => setActiveSubTab('all')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all duration-300 ${activeSubTab === 'all' ? 'bg-slate-900 text-white shadow-xl shadow-black/20' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
          >
            <Layers size={16} /> Histórico Geral
          </button>
        </div>


      </div>

      {/* Visão Geral Filter & Search (apenas aba 'all') */}
      {activeSubTab === 'all' && (
        <div className="bg-white/80 backdrop-blur-xl p-3 rounded-[2.5rem] border border-slate-200/60 shadow-2xl shadow-slate-200/50 animate-in slide-in-from-top-5 duration-500">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
            <div className="relative flex-1 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Pesquisar no histórico de recebíveis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-4 rounded-[1.8rem] border border-slate-100 bg-slate-50 text-sm font-black text-slate-800 placeholder:text-slate-400/80 placeholder:font-bold focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all shadow-inner"
              />
            </div>

            <div className="flex items-center gap-4 bg-slate-50/50 p-2 rounded-[1.8rem] border border-slate-100">
              <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200/50 shadow-sm">
                <Calendar size={18} className="text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-32 text-xs border-none focus:ring-0 bg-transparent text-slate-700 font-black p-0 uppercase tracking-tighter"
                />
                <span className="text-slate-300 font-black text-[10px] uppercase tracking-widest">Até</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-32 text-xs border-none focus:ring-0 bg-transparent text-slate-700 font-black p-0 uppercase tracking-tighter"
                />
                {(startDate || endDate) && (
                  <button
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="ml-2 bg-rose-50 hover:bg-rose-500 p-1.5 rounded-xl text-rose-500 hover:text-white transition-all shadow-sm"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {(startDate || endDate || searchTerm) && (
            <div className="px-6 py-2 flex justify-end">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] italic">
                Exibindo {filteredRecords.length} recebimento{filteredRecords.length !== 1 ? 's' : ''} localizado{filteredRecords.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Record Manager */}
      <div className="animate-in slide-in-from-bottom-5 duration-700">
        <UnifiedReceivableManager
          records={paginatedRecords}
          onRefresh={() => { }}
          viewMode={activeSubTab}
          searchTerm={activeSubTab === 'all' ? searchTerm : undefined}
          hideSearchBar={activeSubTab === 'all'}
        />
      </div>

      {/* Paginação Histórico */}
      {activeSubTab === 'all' && filteredRecords.length > 0 && (
        <div className="flex flex-col items-center gap-3 py-10">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
            Exibindo {paginatedRecords.length} de {filteredRecords.length} registros
          </span>
          {hasMore && (
            <button
              onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
              className="px-12 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] border-2 border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-xl active:scale-95"
            >
              Carregar Mais Resultados
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ReceivablesTab;
