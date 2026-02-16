
import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, RefreshCw, Layers, Filter, Calendar, X, Search } from 'lucide-react';
import UnifiedReceivableManager from './components/UnifiedReceivableManager';
import { FinancialRecord } from '../types';
import { receivablesService, Receivable } from '../../../services/financial/receivablesService';
import { partnerService } from '../../../services/partnerService';
import { loadingService } from '../../../services/loadingService';
import { waitForInit } from '../../../services/supabaseInitService';

// Converter Receivable → FinancialRecord
const convertToFinancialRecord = (receivable: Receivable): FinancialRecord => {
  // Busca o nome do parceiro (cliente)
  const partner = partnerService.getById(receivable.partnerId);
  const partnerName = partner?.name || 'Cliente Desconhecido';

  // Busca informações dos carregamentos vinculados ao pedido de venda
  const loadings = receivable.salesOrderId ? loadingService.getBySalesOrder(receivable.salesOrderId) : [];

  // IMPORTANTE: Usa PESO DE DESCARGA, não peso de carregamento
  let totalWeightKg = 0;
  let totalSc = 0;

  for (const l of loadings) {
    const weightKg = l.unloadWeightKg || l.weightKg || 0;
    totalWeightKg += weightKg;
    totalSc += (weightKg / 60); // Converte KG em sacas (60kg = 1 saca)
  }

  const loadCount = loadings.length;

  // Calcula o preço unitário por saca usando o TOTAL CORRETO de sacas de descarga
  const unitPriceSc = totalSc > 0.01 ? receivable.amount / totalSc : 0;

  console.log('📊 convertToFinancialRecord:', {
    id: receivable.id.substring(0, 8),
    loadings: loadCount,
    totalWeightKg,
    totalSc: totalSc.toFixed(2),
    amount: receivable.amount,
    unitPriceSc: unitPriceSc.toFixed(2)
  });

  return {
    id: receivable.id,
    description: receivable.description,
    entityName: partnerName,
    category: 'Vendas',
    dueDate: receivable.dueDate,
    issueDate: receivable.dueDate,
    originalValue: receivable.amount,
    paidValue: receivable.receivedAmount,
    status: receivable.status === 'received' ? 'paid' : receivable.status === 'overdue' ? 'overdue' : receivable.status === 'partially_received' ? 'partial' : 'pending',
    subType: 'sales_order',
    notes: receivable.notes,
    weightKg: totalWeightKg > 0 ? totalWeightKg : undefined,
    totalSc: totalSc > 0 ? totalSc : undefined,
    loadCount: loadCount > 0 ? loadCount : undefined,
    unitPriceSc: unitPriceSc > 0 ? unitPriceSc : undefined,
    totalTon: totalWeightKg > 0 ? totalWeightKg / 1000 : undefined
  };
};

const ReceivablesTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'open' | 'all'>('open');
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros de período (apenas Visão Geral)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Paginação (apenas Visão Geral)
  const PAGE_SIZE = 100;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await receivablesService.loadFromSupabase();
      const converted = (data || []).map(convertToFinancialRecord);
      setRecords(converted);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initTab = async () => {
      await waitForInit();
      receivablesService.startRealtime();
      await loadData();
    };

    void initTab();

    // Subscribe to real-time updates
    const unsubscribe = receivablesService.subscribe((updatedRecords) => {
      console.log('🔔 REALTIME: Contas a Receber atualizado!', updatedRecords.length, 'registros');
      const converted = updatedRecords.map(convertToFinancialRecord);
      setRecords(converted);
    });

    return () => {
      unsubscribe();
    };
  }, []);

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

        <button
          onClick={loadData}
          className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-100"
          title="Atualizar Banco de Dados"
        >
          <RefreshCw size={20} />
        </button>
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
          onRefresh={loadData}
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
