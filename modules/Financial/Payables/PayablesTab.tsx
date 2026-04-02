
import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Truck, Percent, Layers, Calendar, X, Search } from 'lucide-react';
import UnifiedPayableManager from './components/UnifiedPayableManager';
import { FinancialRecord } from '../types';
import { usePayables } from '../../../hooks/useFinancialEntries';
import type { EnrichedPayableEntry } from '../../../services/financialEntriesService';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../hooks/queryKeys';

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
    description = entry.order_number ? `#${entry.order_number}` : partnerName;
    entityName = entry.order_partner_name || partnerName;
    loadCount = entry.load_count;
    weightKg = entry.total_weight_kg;
    totalTon = entry.total_weight_ton;
    totalSc = entry.total_weight_sc;
    unitPriceSc = entry.unit_price_sc || undefined;
  } else if (subType === 'freight') {
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
    category: subType === 'purchase_order' ? 'Compras' : subType === 'freight' ? 'Frete' : subType === 'commission' ? 'Comissão' : 'Suprimentos',
    dueDate: entry.due_date || entry.created_date || new Date().toISOString(),
    issueDate: entry.created_date || new Date().toISOString(),
    originalValue: entry.total_amount,
    paidValue: entry.paid_amount,
    remainingValue: entry.remaining_amount,
    deductionsAmount: entry.deductions_amount,
    netAmount: entry.net_amount,
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

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const PAGE_SIZE = 100;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data: rawPayables = [], isLoading: loading } = usePayables();
  const records = useMemo(() => rawPayables.map(toFinancialRecord), [rawPayables]);



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

  const totalFiltered = allPurchases.length + allFreights.length + allCommissions.length;

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [startDate, endDate, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Premium Sub-navigation */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/80 backdrop-blur-md rounded-2xl border border-slate-200/50 shadow-inner w-full xl:w-fit">
          <button
            onClick={() => setActiveSubTab('purchase')}
            className={`flex-1 xl:flex-none flex items-center justify-center gap-3 px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all duration-300 ${activeSubTab === 'purchase' ? 'bg-white text-rose-600 shadow-xl shadow-rose-900/5' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
          >
            <ShoppingCart size={16} /> Fornecedores
          </button>
          <button
            onClick={() => setActiveSubTab('freight')}
            className={`flex-1 xl:flex-none flex items-center justify-center gap-3 px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all duration-300 ${activeSubTab === 'freight' ? 'bg-white text-blue-600 shadow-xl shadow-blue-900/5' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
          >
            <Truck size={16} /> Fretes
          </button>
          <button
            onClick={() => setActiveSubTab('commission')}
            className={`flex-1 xl:flex-none flex items-center justify-center gap-3 px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all duration-300 ${activeSubTab === 'commission' ? 'bg-white text-violet-600 shadow-xl shadow-violet-900/5' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
          >
            <Percent size={16} /> Comissões
          </button>
          <div className="hidden xl:block w-px h-8 bg-slate-200 self-center mx-2" />
          <button
            onClick={() => setActiveSubTab('all')}
            className={`flex-1 xl:flex-none flex items-center justify-center gap-3 px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all duration-300 ${activeSubTab === 'all' ? 'bg-slate-900 text-white shadow-xl shadow-black/20' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
          >
            <Layers size={16} /> Histórico Geral
          </button>
        </div>


      </div>

      {/* Visão Geral (Histórico) */}
      {activeSubTab === 'all' ? (
        <div className="space-y-12 animate-in slide-in-from-bottom-5">
          {/* Advanced Search & Filtration */}
          <div className="bg-white/80 backdrop-blur-xl p-3 rounded-[2.5rem] border border-slate-200/60 shadow-2xl shadow-slate-200/50">
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
              <div className="relative flex-1 group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="Pesquisar por parceiro, pedido, motorista ou placa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 rounded-[1.8rem] border border-slate-100 bg-slate-50 text-sm font-black text-slate-800 placeholder:text-slate-400/80 placeholder:font-bold focus:bg-white focus:border-rose-400 focus:ring-4 focus:ring-rose-500/5 outline-none transition-all shadow-inner"
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

            {/* Filter Result Counters */}
            {(startDate || endDate || searchTerm) && (
              <div className="px-6 py-2 flex justify-end">
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] italic">
                  Exibindo {totalFiltered} registro{totalFiltered !== 1 ? 's' : ''} filtrado{totalFiltered !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          <section className="space-y-6">
            <div className="flex items-center gap-4 border-l-4 border-rose-500 pl-4 py-1">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">Fluxo de Compras</h2>
              <span className="text-[10px] font-black bg-rose-100 text-rose-600 px-3 py-1 rounded-full uppercase tracking-widest leading-none">{allPurchases.length} títulos</span>
            </div>
            <UnifiedPayableManager type="purchase" records={paginatedPurchases} onRefresh={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_PAYABLES })} searchTerm={searchTerm} hideSearchBar={true} />
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-4 border-l-4 border-blue-500 pl-4 py-1">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">Logística de Cargas</h2>
              <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-3 py-1 rounded-full uppercase tracking-widest leading-none">{allFreights.length} títulos</span>
            </div>
            <UnifiedPayableManager type="freight" records={paginatedFreights} onRefresh={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_PAYABLES })} searchTerm={searchTerm} hideSearchBar={true} />
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-4 border-l-4 border-violet-500 pl-4 py-1">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">Comissões Comerciais</h2>
              <span className="text-[10px] font-black bg-violet-100 text-violet-600 px-3 py-1 rounded-full uppercase tracking-widest leading-none">{allCommissions.length} títulos</span>
            </div>
            <UnifiedPayableManager type="commission" records={paginatedCommissions} onRefresh={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_PAYABLES })} searchTerm={searchTerm} hideSearchBar={true} />
          </section>
        </div>
      ) : (
        /* VISÃO ESPECÍFICA (SÓ ABERTOS) */
        <div className="animate-in slide-in-from-right-10 duration-500">
          <UnifiedPayableManager
            key={activeSubTab}
            type={activeSubTab as any}
            records={records.filter(r => {
              const isTypeMatch = (
                (activeSubTab === 'purchase' && r.subType === 'purchase_order') ||
                (activeSubTab === 'freight' && r.subType === 'freight') ||
                (activeSubTab === 'commission' && r.subType === 'commission')
              );
              return isTypeMatch && r.status !== 'paid';
            })}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_PAYABLES })}
          />
        </div>
      )}
    </div>
  );
};

export default PayablesTab;
