
import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Truck, Percent, Layers, Calendar, X, Search } from 'lucide-react';
import UnifiedPayableManager from './components/UnifiedPayableManager';
import { FinancialRecord } from '../types';
import { usePayables } from '../../../hooks/useFinancialEntries';
import type { EnrichedPayableEntry } from '../../../services/financialEntriesService';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../hooks/queryKeys';

// ============================================================================
// Adaptador: EnrichedPayableEntry (VIEW SQL) → FinancialRecord (UI)
// Zero cálculo no frontend — tudo vem pronto do banco de dados
// ============================================================================
const toFinancialRecord = (entry: EnrichedPayableEntry): FinancialRecord => {
  const origin = entry.origin_type || '';
  const status = entry.status === 'paid' ? 'paid'
    : entry.status === 'partially_paid' ? 'partial'
    : entry.status === 'overdue' ? 'overdue'
    : 'pending';

  const subType = origin === 'purchase_order' ? 'purchase_order'
    : origin === 'commission' ? 'commission'
    : origin === 'expense' ? 'admin'
    : origin === 'loan' ? 'loan_taken'
    : origin === 'freight' ? 'freight'
    : 'freight';

  // Dados vindos do SQL (partner_name já resolvido pela VIEW)
  const partnerName = entry.partner_name;

  let description = partnerName;
  let entityName = partnerName;
  let driverName: string | undefined;
  let weightKg: number | undefined;
  let totalTon: number | undefined;
  let totalSc: number | undefined;
  let unitPriceSc: number | undefined;
  let unitPriceTon: number | undefined;
  let loadCount: number | undefined;

  if (subType === 'purchase_order') {
    // Dados do pedido e carregamentos já agregados pela VIEW
    description = entry.order_number ? `#${entry.order_number}` : partnerName;
    entityName = entry.order_partner_name || partnerName;
    loadCount = entry.load_count;
    weightKg = entry.total_weight_kg;
    totalTon = entry.total_weight_ton;
    totalSc = entry.total_weight_sc;
    unitPriceSc = entry.unit_price_sc || undefined;
  } else if (subType === 'freight') {
    // Dados de frete já resolvidos pela VIEW
    description = entry.freight_vehicle_plate || partnerName;
    driverName = entry.freight_driver_name;
    weightKg = entry.freight_weight_kg;
    totalTon = entry.freight_weight_ton;
    unitPriceTon = entry.freight_price_per_ton || undefined;
  } else if (subType === 'commission') {
    description = `Comissão - ${partnerName}`;
  }

  return {
    id: entry.id,
    originId: entry.origin_id,
    description,
    entityName,
    driverName,
    category: subType === 'purchase_order' ? 'Compras' : subType === 'freight' ? 'Frete' : subType === 'commission' ? 'Comissão' : 'Outros',
    dueDate: entry.due_date || entry.created_date,
    issueDate: entry.created_date,
    originalValue: entry.total_amount,
    paidValue: entry.paid_amount,
    remainingValue: entry.remaining_amount,
    discountValue: 0,
    status,
    subType: subType as any,
    weightKg,
    totalTon,
    totalSc,
    unitPriceSc,
    unitPriceTon,
    loadCount,
  };
};

const PayablesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'purchase' | 'freight' | 'commission'>('purchase');

  // Filtros de período (apenas Visão Geral)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Paginação
  const PAGE_SIZE = 100;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // TanStack Query: dados + realtime automático (VIEW já vem enriquecida)
  const { data: rawPayables = [], isLoading: loading } = usePayables();
  const records = useMemo(() => rawPayables.map(toFinancialRecord), [rawPayables]);

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_PAYABLES });
  };

  const getFilteredRecords = (type: 'purchase' | 'freight' | 'commission' | 'all') => {
    if (type === 'all') return records;
    return records.filter(r => {
      const isTypeMatch = (
        (type === 'purchase' && r.subType === 'purchase_order') ||
        (type === 'freight' && r.subType === 'freight') ||
        (type === 'commission' && r.subType === 'commission')
      );
      const isPending = r.status !== 'paid';
      return isTypeMatch && isPending;
    });
  };

  const filteredRecords = useMemo(() => {
    if (!startDate && !endDate && !searchTerm) return records;
    const searchLower = searchTerm.toLowerCase();
    return records.filter(r => {
      const d = r.dueDate || r.issueDate || '';
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      if (searchTerm) {
        return r.description.toLowerCase().includes(searchLower) ||
          r.entityName.toLowerCase().includes(searchLower) ||
          r.notes?.toLowerCase().includes(searchLower);
      }
      return true;
    });
  }, [records, startDate, endDate, searchTerm]);

  const allPurchases = useMemo(() => filteredRecords.filter(r => r.subType === 'purchase_order'), [filteredRecords]);
  const allFreights = useMemo(() => filteredRecords.filter(r => r.subType === 'freight'), [filteredRecords]);
  const allCommissions = useMemo(() => filteredRecords.filter(r => r.subType === 'commission'), [filteredRecords]);

  const paginatedPurchases = useMemo(() => allPurchases.slice(0, visibleCount), [allPurchases, visibleCount]);
  const paginatedFreights = useMemo(() => allFreights.slice(0, visibleCount), [allFreights, visibleCount]);
  const paginatedCommissions = useMemo(() => allCommissions.slice(0, visibleCount), [allCommissions, visibleCount]);
  const hasMore = allPurchases.length > visibleCount || allFreights.length > visibleCount || allCommissions.length > visibleCount;
  const totalFiltered = allPurchases.length + allFreights.length + allCommissions.length;
  const totalVisible = Math.min(allPurchases.length, visibleCount) + Math.min(allFreights.length, visibleCount) + Math.min(allCommissions.length, visibleCount);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [startDate, endDate, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Sub-navigation & Refresh */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit flex-wrap">
          <button
            onClick={() => setActiveSubTab('purchase')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeSubTab === 'purchase' ? 'bg-white text-rose-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <ShoppingCart size={16} />
            Fornecedores (Abertos)
          </button>
          <button
            onClick={() => setActiveSubTab('freight')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeSubTab === 'freight' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <Truck size={16} />
            Fretes (Abertos)
          </button>
          <button
            onClick={() => setActiveSubTab('commission')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeSubTab === 'commission' ? 'bg-white text-violet-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <Percent size={16} />
            Comissões (Abertas)
          </button>
          <div className="w-px h-6 bg-slate-300 mx-1 self-center"></div>
          <button
            onClick={() => setActiveSubTab('all')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeSubTab === 'all' ? 'bg-slate-800 text-white shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <Layers size={16} />
            Visão Geral (Todos)
          </button>
        </div>

      </div>

      {/* RENDERIZAÇÃO CONDICIONAL */}

      {activeSubTab === 'all' ? (
        <div className="space-y-8 animate-in fade-in">
          {/* Busca e Filtro Unificado */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row gap-3 items-center">

              {/* Busca Global */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar histórico de fornecedores, fretes e comissões..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:border-blue-500 focus:ring-0 outline-none transition-all font-bold"
                />
              </div>

              {/* Filtro de Data */}
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 w-full md:w-auto overflow-x-auto">
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
                    className="ml-2 hover:bg-slate-200 p-1 rounded-full text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

            </div>

            {/* Contador */}
            {(startDate || endDate || searchTerm) && (
              <div className="mt-3 text-right border-t border-slate-100 pt-2">
                <span className="text-xs font-bold text-slate-400">
                  {totalFiltered} registro{totalFiltered !== 1 ? 's' : ''} encontrado{totalFiltered !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Bloco Fornecedores */}
          <section>
            <div className="flex items-center gap-2 mb-4 px-2 border-l-4 border-rose-500">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Histórico Fornecedores</h3>
              <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">{allPurchases.length} títulos</span>
            </div>
            <UnifiedPayableManager type="purchase" records={paginatedPurchases} onRefresh={refreshData} searchTerm={searchTerm} hideSearchBar={true} />
          </section>

          {/* Bloco Fretes */}
          <section>
            <div className="flex items-center gap-2 mb-4 px-2 border-l-4 border-blue-500">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Histórico de Fretes</h3>
              <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">{allFreights.length} títulos</span>
            </div>
            <UnifiedPayableManager type="freight" records={paginatedFreights} onRefresh={refreshData} searchTerm={searchTerm} hideSearchBar={true} />
          </section>

          {/* Bloco Comissões */}
          <section>
            <div className="flex items-center gap-2 mb-4 px-2 border-l-4 border-violet-500">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Histórico de Comissões</h3>
              <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">{allCommissions.length} títulos</span>
            </div>
            <UnifiedPayableManager type="commission" records={paginatedCommissions} onRefresh={refreshData} searchTerm={searchTerm} hideSearchBar={true} />
          </section>

          {/* Paginação */}
          {totalFiltered > 0 && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <span className="text-xs font-bold text-slate-400">Exibindo {totalVisible} de {totalFiltered} registros</span>
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
      ) : (
        /* VISÃO ESPECÍFICA (SÓ ABERTOS) */
        <UnifiedPayableManager
          key={activeSubTab}
          type={activeSubTab as any}
          records={getFilteredRecords(activeSubTab)}
          onRefresh={refreshData}
        />
      )}

    </div>
  );
};

export default PayablesTab;
