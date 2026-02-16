
import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Truck, Percent, RefreshCw, Layers, Calendar, X, Search } from 'lucide-react';
import UnifiedPayableManager from './components/UnifiedPayableManager';
import { FinancialRecord } from '../types';
import { payablesService, Payable } from '../../../services/financial/payablesService';
import { loadingService } from '../../../services/loadingService';
import { purchaseService } from '../../../services/purchaseService';
import { waitForInit } from '../../../services/supabaseInitService';

// Converter Payable → FinancialRecord
const convertToFinancialRecord = (
  payable: Payable,
  totalWeightKg?: number,
  totalSc?: number,
  loadCount?: number,
  unitPriceTon?: number,
  unitPriceSc?: number
): FinancialRecord => {
  // Para pedidos de compra, recalcula pago/abatimentos com base nas transações do pedido (evita exibir só o primeiro pagamento)
  let paidValue = payable.paidAmount;
  let discountValue = 0;

  if (payable.subType === 'purchase_order' && payable.purchaseOrderId) {
    const order = purchaseService.getById(payable.purchaseOrderId);
    const txs = order?.transactions || [];
    const paidTx = txs
      .filter(t => t.type === 'payment' || t.type === 'advance')
      .reduce((sum, t) => sum + (t.value || 0), 0);
    const discTx = txs.reduce((sum, t) => sum + (t.discountValue || 0), 0);
    paidValue = Math.max(paidValue, order?.paidValue || 0, paidTx);
    discountValue = Math.max(order?.discountValue || 0, discTx);
  }

  const status = payable.amount <= 0
    ? 'pending'
    : (paidValue + discountValue) >= payable.amount - 0.05
      ? 'paid'
      : paidValue + discountValue > 0
        ? 'partial'
        : payable.status === 'overdue'
          ? 'overdue'
          : 'pending';

  return {
    id: payable.id,
    description: payable.description,
    entityName: payable.partnerName || 'Parceiro',
    driverName: payable.driverName,
    category: payable.subType === 'purchase_order' ? 'Compras' : payable.subType === 'freight' ? 'Frete' : 'Outros',
    dueDate: payable.dueDate,
    issueDate: payable.dueDate,
    originalValue: payable.amount,
    paidValue,
    discountValue,
    status,
    subType: payable.subType as any,
    notes: payable.notes,
    weightSc: payable.weightKg,
    weightKg: totalWeightKg ?? payable.weightKg,
    unitPriceTon,
    unitPriceSc,
    loadCount,
    totalTon: totalWeightKg ? totalWeightKg / 1000 : undefined,
    totalSc
  };
};

const PayablesTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'purchase' | 'freight' | 'commission'>('purchase');
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
      // 🔥 FORCE REFRESH: Garante que temos dados frescos do Supabase
      await payablesService.loadFromSupabase();
      const all = payablesService.getAll();

      console.log('📊 Payables Loaded:', all.length, 'Freights:', all.filter(p => p.subType === 'freight').length);

      const converted = all.map((payable) => {
        // CORREÇÃO: Para Fretes, usar o peso do próprio payable (carregamento específico)
        // Para Compras, soma tudo vinculada ao pedido
        let totalWeightKg = payable.weightKg;
        let totalSc = undefined;
        let loadCount = undefined;

        if (payable.subType === 'purchase_order' && payable.purchaseOrderId) {
          const loadings = loadingService.getByPurchaseOrder(payable.purchaseOrderId);
          totalWeightKg = loadings.reduce((sum, l) => sum + (l.weightKg || 0), 0);
          totalSc = loadings.reduce((sum, l) => sum + (l.weightSc || 0), 0) || undefined;
          loadCount = loadings.length;
        }

        // Calcula unitários com base no peso correto
        const unitPriceTon = totalWeightKg && totalWeightKg > 0 ? payable.amount / (totalWeightKg / 1000) : undefined;
        // const unitPriceSc = totalSc && totalSc > 0 ? payable.amount / totalSc : undefined; // Removido uso de Sc para simplificar se não necessário, ou manter lógica original

        return convertToFinancialRecord(payable, totalWeightKg, totalSc, loadCount, unitPriceTon, undefined);
      });
      setRecords(converted);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initTab = async () => {
      await waitForInit();
      payablesService.startRealtime();
      await loadData();
    };

    const unsubscribe = payablesService.subscribe((updatedRecords) => {
      const converted = updatedRecords.map((payable) => {
        // MESMA CORREÇÃO NO REALTIME
        let totalWeightKg = payable.weightKg;
        let totalSc = undefined;
        let loadCount = undefined;

        if (payable.subType === 'purchase_order' && payable.purchaseOrderId) {
          const loadings = loadingService.getByPurchaseOrder(payable.purchaseOrderId);
          totalWeightKg = loadings.reduce((sum, l) => sum + (l.weightKg || 0), 0);
          totalSc = loadings.reduce((sum, l) => sum + (l.weightSc || 0), 0) || undefined;
          loadCount = loadings.length;
        }

        const unitPriceTon = totalWeightKg && totalWeightKg > 0 ? payable.amount / (totalWeightKg / 1000) : undefined;

        return convertToFinancialRecord(payable, totalWeightKg, totalSc, loadCount, unitPriceTon, undefined);
      });
      setRecords(converted);
    });

    void initTab(); // Call init AFTER defining unsubscribe to avoid race? No, logic is fine.

    return () => {
      unsubscribe();
    };
  }, []);

  // --- LÓGICA DE FILTRAGEM ---
  const getFilteredRecords = (type: 'purchase' | 'freight' | 'commission' | 'all') => {
    // Se for aba específica, MOSTRAR APENAS O QUE ESTÁ ABERTO (pending/partial/overdue)
    // Para 'all' (Visão Geral), mostra tudo (incluindo pagos)
    // OBS: O UnifiedPayableManager trata a visualização, mas aqui filtramos a fonte.

    // Se for aba "Todos", mostrar tudo (inclusive pagos)

    if (type === 'all') {
      return records;
    }

    const filtered = records.filter(r => {
      const isTypeMatch = (
        (type === 'purchase' && r.subType === 'purchase_order') ||
        (type === 'freight' && r.subType === 'freight') ||
        (type === 'commission' && r.subType === 'commission')
      );
      // CRÍTICO: Ocultar itens com status 'paid' nas abas específicas
      const isPending = r.status !== 'paid';

      return isTypeMatch && isPending;
    });

    console.log(`🔍 Filtro [${type}]: Total=${records.length}, Filtrados=${filtered.length}`, {
      porTipo: records.reduce((acc, r) => { acc[r.subType || 'undefined'] = (acc[r.subType || 'undefined'] || 0) + 1; return acc; }, {} as any),
      porStatus: records.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as any)
    });

    return filtered;
  };

  // Filtro por período e termo para Visão Geral
  const filteredRecords = useMemo(() => {
    if (!startDate && !endDate && !searchTerm) return records;

    const searchLower = searchTerm.toLowerCase();

    return records.filter(r => {
      // Filtro Data
      const d = r.dueDate || r.issueDate || '';
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;

      // Filtro Texto
      if (searchTerm) {
        return r.description.toLowerCase().includes(searchLower) ||
          r.entityName.toLowerCase().includes(searchLower) ||
          r.notes?.toLowerCase().includes(searchLower);
      }

      return true;
    });
  }, [records, startDate, endDate, searchTerm]);

  // Separação para a visão "Todos" agrupada (com filtros aplicados)
  const allPurchases = useMemo(() => filteredRecords.filter(r => r.subType === 'purchase_order'), [filteredRecords]);
  const allFreights = useMemo(() => filteredRecords.filter(r => r.subType === 'freight'), [filteredRecords]);
  const allCommissions = useMemo(() => filteredRecords.filter(r => r.subType === 'commission'), [filteredRecords]);

  // Paginação: limita registros visíveis por seção
  const paginatedPurchases = useMemo(() => allPurchases.slice(0, visibleCount), [allPurchases, visibleCount]);
  const paginatedFreights = useMemo(() => allFreights.slice(0, visibleCount), [allFreights, visibleCount]);
  const paginatedCommissions = useMemo(() => allCommissions.slice(0, visibleCount), [allCommissions, visibleCount]);
  const hasMore = allPurchases.length > visibleCount || allFreights.length > visibleCount || allCommissions.length > visibleCount;
  const totalFiltered = allPurchases.length + allFreights.length + allCommissions.length;
  const totalVisible = Math.min(allPurchases.length, visibleCount) + Math.min(allFreights.length, visibleCount) + Math.min(allCommissions.length, visibleCount);

  // Reset paginação quando filtro muda
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
        <button onClick={loadData} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-100 rounded-full transition-colors" title="Atualizar">
          <RefreshCw size={18} />
        </button>
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
            <UnifiedPayableManager type="purchase" records={paginatedPurchases} onRefresh={loadData} searchTerm={searchTerm} hideSearchBar={true} />
          </section>

          {/* Bloco Fretes */}
          <section>
            <div className="flex items-center gap-2 mb-4 px-2 border-l-4 border-blue-500">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Histórico de Fretes</h3>
              <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">{allFreights.length} títulos</span>
            </div>
            <UnifiedPayableManager type="freight" records={paginatedFreights} onRefresh={loadData} searchTerm={searchTerm} hideSearchBar={true} />
          </section>

          {/* Bloco Comissões */}
          <section>
            <div className="flex items-center gap-2 mb-4 px-2 border-l-4 border-violet-500">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Histórico de Comissões</h3>
              <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">{allCommissions.length} títulos</span>
            </div>
            <UnifiedPayableManager type="commission" records={paginatedCommissions} onRefresh={loadData} searchTerm={searchTerm} hideSearchBar={true} />
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
          onRefresh={loadData}
        />
      )}

    </div>
  );
};

export default PayablesTab;
