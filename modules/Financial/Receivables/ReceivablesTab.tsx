
import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, RefreshCw, Layers, Filter } from 'lucide-react';
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
    if (activeSubTab === 'all') return records;
    // Filtra apenas o que não está totalmente recebido
    return records.filter(r => r.status !== 'received' && r.status !== 'cancelled');
  }, [records, activeSubTab]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit shadow-inner">
          <button
            onClick={() => setActiveSubTab('open')}
            className={`flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${
              activeSubTab === 'open' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Filter size={16} />
            Em Aberto
          </button>
          <button
            onClick={() => setActiveSubTab('all')}
            className={`flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${
              activeSubTab === 'all' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
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
        <UnifiedReceivableManager 
          records={filteredRecords} 
          onRefresh={loadData}
          viewMode={activeSubTab}
        />
      </div>
    </div>
  );
};

export default ReceivablesTab;
