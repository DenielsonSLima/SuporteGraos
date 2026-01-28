
import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Truck, Percent, RefreshCw, Layers } from 'lucide-react';
import UnifiedPayableManager from './components/UnifiedPayableManager';
import { FinancialRecord } from '../types';
import { payablesService, Payable } from '../../../services/financial/payablesService';
import { loadingService } from '../../../services/loadingService';

// Converter Payable → FinancialRecord
const convertToFinancialRecord = (
  payable: Payable,
  totalWeightKg?: number,
  totalSc?: number,
  loadCount?: number,
  unitPriceTon?: number,
  unitPriceSc?: number
): FinancialRecord => ({
  id: payable.id,
  description: payable.description,
  entityName: payable.partnerName || 'Parceiro',
  driverName: payable.driverName,
  category: payable.subType === 'purchase_order' ? 'Compras' : payable.subType === 'freight' ? 'Frete' : 'Outros',
  dueDate: payable.dueDate,
  issueDate: payable.dueDate,
  originalValue: payable.amount,
  paidValue: payable.paidAmount,
  status: payable.status === 'paid' ? 'paid' : payable.status === 'overdue' ? 'overdue' : payable.status === 'partially_paid' ? 'partial' : 'pending',
  subType: payable.subType,
  notes: payable.notes,
  weightSc: payable.weightKg,
  weightKg: totalWeightKg ?? payable.weightKg,
  unitPriceTon,
  unitPriceSc,
  loadCount,
  totalTon: totalWeightKg ? totalWeightKg / 1000 : undefined,
  totalSc
});

const PayablesTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'purchase' | 'freight' | 'commission'>('purchase');
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await payablesService.loadFromSupabase();
      console.log('📊 PayablesTab - Dados carregados do Supabase:', data?.length || 0, 'registros');
      console.log('📊 PayablesTab - Detalhes:', data?.map(p => ({ 
        id: p.id.substring(0, 8), 
        subType: p.subType, 
        partnerName: p.partnerName,
        status: p.status,
        amount: p.amount 
      })));
      const converted = (data || []).map((payable) => {
        const loadings = payable.purchaseOrderId ? loadingService.getByPurchaseOrder(payable.purchaseOrderId) : [];
        const totalWeightKg = loadings.reduce((sum, l) => sum + (l.weightKg || 0), 0);
        const totalSc = loadings.reduce((sum, l) => sum + (l.weightSc || 0), 0) || undefined;
        const loadCount = loadings.length;
        const unitPriceTon = totalWeightKg > 0 ? payable.amount / (totalWeightKg / 1000) : undefined;
        const unitPriceSc = totalSc && totalSc > 0 ? payable.amount / totalSc : undefined;
        return convertToFinancialRecord(payable, totalWeightKg || undefined, totalSc, loadCount || undefined, unitPriceTon, unitPriceSc);
      });
      setRecords(converted);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Subscribe to real-time updates
    const unsubscribe = payablesService.subscribe((updatedRecords) => {
      const converted = updatedRecords.map((payable) => {
        const loadings = payable.purchaseOrderId ? loadingService.getByPurchaseOrder(payable.purchaseOrderId) : [];
        const totalWeightKg = loadings.reduce((sum, l) => sum + (l.weightKg || 0), 0);
        const totalSc = loadings.reduce((sum, l) => sum + (l.weightSc || 0), 0) || undefined;
        const loadCount = loadings.length;
        const unitPriceTon = totalWeightKg > 0 ? payable.amount / (totalWeightKg / 1000) : undefined;
        const unitPriceSc = totalSc && totalSc > 0 ? payable.amount / totalSc : undefined;
        return convertToFinancialRecord(payable, totalWeightKg || undefined, totalSc, loadCount || undefined, unitPriceTon, unitPriceSc);
      });
      setRecords(converted);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // --- LÓGICA DE FILTRAGEM ---
  const getFilteredRecords = (type: 'purchase' | 'freight' | 'commission' | 'all') => {
    // Se for aba específica, MOSTRAR APENAS O QUE ESTÁ ABERTO (pending/partial/overdue)
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

  // Separação para a visão "Todos" agrupada
  const allPurchases = useMemo(() => records.filter(r => r.subType === 'purchase_order'), [records]);
  const allFreights = useMemo(() => records.filter(r => r.subType === 'freight'), [records]);
  const allCommissions = useMemo(() => records.filter(r => r.subType === 'commission'), [records]);

  return (
    <div className="space-y-6">
      {/* Sub-navigation & Refresh */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit flex-wrap">
          <button
            onClick={() => setActiveSubTab('purchase')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeSubTab === 'purchase' ? 'bg-white text-rose-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShoppingCart size={16} />
            Fornecedores (Abertos)
          </button>
          <button
            onClick={() => setActiveSubTab('freight')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeSubTab === 'freight' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Truck size={16} />
            Fretes (Abertos)
          </button>
          <button
            onClick={() => setActiveSubTab('commission')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeSubTab === 'commission' ? 'bg-white text-violet-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Percent size={16} />
            Comissões (Abertas)
          </button>
          <div className="w-px h-6 bg-slate-300 mx-1 self-center"></div>
          <button
            onClick={() => setActiveSubTab('all')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeSubTab === 'all' ? 'bg-slate-800 text-white shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'
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
        <div className="space-y-12 animate-in fade-in">
            {/* Bloco Fornecedores */}
            <section>
                <div className="flex items-center gap-2 mb-4 px-2 border-l-4 border-rose-500">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Histórico Fornecedores</h3>
                    <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">{allPurchases.length} títulos</span>
                </div>
                <UnifiedPayableManager type="purchase" records={allPurchases} onRefresh={loadData} />
            </section>

            {/* Bloco Fretes */}
            <section>
                <div className="flex items-center gap-2 mb-4 px-2 border-l-4 border-blue-500">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Histórico de Fretes</h3>
                    <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">{allFreights.length} títulos</span>
                </div>
                <UnifiedPayableManager type="freight" records={allFreights} onRefresh={loadData} />
            </section>

            {/* Bloco Comissões */}
            <section>
                <div className="flex items-center gap-2 mb-4 px-2 border-l-4 border-violet-500">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Histórico de Comissões</h3>
                    <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">{allCommissions.length} títulos</span>
                </div>
                <UnifiedPayableManager type="commission" records={allCommissions} onRefresh={loadData} />
            </section>
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
