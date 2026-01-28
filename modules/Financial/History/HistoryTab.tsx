
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  Calendar, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Printer,
  Layers,
  Banknote,
  Tags,
  RefreshCw
} from 'lucide-react';
import FinancialTable from '../components/FinancialTable';
import HistoryGroupedList from './components/HistoryGroupedList';
import FinancialPdfModal from './components/FinancialPdfModal';
import FinancialRecordDetailsModal from './components/FinancialRecordDetailsModal';
import { FinancialRecord } from '../types';
import { financialHistoryService } from '../../../services/financial/financialHistoryService';
import { payablesService } from '../../../services/financial/payablesService';
import { receivablesService } from '../../../services/financial/receivablesService';
import { financialService } from '../../../services/financialService';
import { partnerService } from '../../../services/partnerService';

const HistoryTab: React.FC = () => {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'payable' | 'receivable'>('all');
  
  // Flag para evitar múltiplas chamadas simultâneas
  const loadingRef = React.useRef(false);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Filters
  const [searchText, setSearchText] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'month' | 'entity'>('none');

  // Modal State
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(null);

  // --- CARREGAMENTO DE DADOS CONSOLIDADO COM DEBOUNCE ---
  const loadRealData = useCallback(async () => {
    // ✅ EVITAR múltiplas chamadas simultâneas
    if (loadingRef.current) {
      console.log('⏳ Carregamento já em progresso, ignorando...');
      return;
    }

    loadingRef.current = true;
    setIsLoading(true);

    try {
      // 1. Todos os Títulos (Pagos e Pendentes - O HISTÓRICO MOSTRA TUDO!)
      const payablesRaw = await payablesService.loadFromSupabase();
      const receivablesRaw = await receivablesService.loadFromSupabase();
      
      // ✅ CONVERTER Payables para FinancialRecord
      const payables: FinancialRecord[] = payablesRaw.map(p => ({
        id: p.id,
        description: p.description,
        entityName: p.partnerName || 'Parceiro',
        category: p.subType === 'purchase_order' ? 'Compras' : p.subType === 'freight' ? 'Frete' : 'Comissões',
        dueDate: p.dueDate,
        issueDate: p.dueDate,
        originalValue: p.amount,
        paidValue: p.paidAmount,
        status: p.status === 'paid' ? 'paid' : p.status === 'overdue' ? 'overdue' : p.status === 'partially_paid' ? 'partial' : 'pending',
        subType: p.subType,
        notes: p.notes,
        bankAccount: p.paymentMethod
      }));
      
      // ✅ CONVERTER Receivables para FinancialRecord  
      const receivables: FinancialRecord[] = receivablesRaw.map(r => {
        const partner = partnerService.getById(r.partnerId);
        const subType = r.salesOrderId ? 'sales_order' : 'receipt';
        return {
          id: r.id,
          description: r.description,
          entityName: partner?.name || partner?.companyName || 'Cliente',
          category: subType === 'sales_order' ? 'Vendas' : 'Recebimentos',
          dueDate: r.dueDate,
          issueDate: r.dueDate,
          originalValue: r.amount,
          paidValue: r.receivedAmount,
          status: r.status === 'received' ? 'paid' : r.status === 'overdue' ? 'overdue' : r.status === 'partially_received' ? 'partial' : 'pending',
          subType,
          notes: r.notes,
          bankAccount: r.paymentMethod
        };
      });
      
      // 2. Movimentações Reais (Baixas, Despesas Diretas, etc.)
      const standalone = await financialHistoryService.loadFromSupabase();

      // 3. Saldos Iniciais (Aportes)
      const initialBalances = financialService.getInitialBalances().map(b => ({
        id: `init-${b.id}`,
        description: 'SALDO INICIAL DE CONTA',
        entityName: 'SISTEMA',
        category: 'Saldo Inicial',
        issueDate: b.date,
        dueDate: b.date,
        originalValue: b.value,
        paidValue: b.value,
        status: 'paid' as const,
        subType: 'loan_granted' as any,
        bankAccount: b.accountName,
        notes: 'Lançamento de abertura de conta'
      }));

      // Consolida tudo
      const all: FinancialRecord[] = [...payables, ...receivables, ...standalone, ...initialBalances];
      
      // Ordena por data de lançamento decrescente
      setRecords(all.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()));
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRealData();
    
    // ✅ DEBOUNCE nas subscriptions para evitar atualizações muito frequentes
    const debouncedLoad = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        console.log('🔄 Atualizando após debounce...');
        loadRealData();
      }, 1000); // Aguarda 1 segundo de inatividade
    };
    
    // Subscribe to real-time updates for all financial types
    const unsubPayables = payablesService.subscribe(() => {
      console.log('🔔 REALTIME: Payables atualizado!');
      debouncedLoad();
    });
    const unsubReceivables = receivablesService.subscribe(() => {
      console.log('🔔 REALTIME: Receivables atualizado!');
      debouncedLoad();
    });
    const unsubHistory = financialHistoryService.subscribe(() => {
      console.log('🔔 REALTIME: Financial History atualizado!');
      debouncedLoad();
    });

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      unsubPayables();
      unsubReceivables();
      unsubHistory();
    };
  }, [loadRealData]);

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // 1. Tab Filter
      if (filterType === 'payable') {
        const isDebit = ['purchase_order', 'freight', 'commission', 'admin', 'loan_taken', 'shareholder'].includes(record.subType || '');
        if (!isDebit) return false;
      } else if (filterType === 'receivable') {
        const isCredit = ['sales_order', 'loan_granted', 'receipt'].includes(record.subType || '') || record.category === 'Saldo Inicial' || record.category === 'Venda de Ativo';
        if (!isCredit) return false;
      }

      // 2. Search
      const searchLower = searchText.toLowerCase();
      const textMatch = 
        record.description.toLowerCase().includes(searchLower) || 
        record.entityName.toLowerCase().includes(searchLower) ||
        record.notes?.toLowerCase().includes(searchLower);

      // 3. Date Range
      if (startDate && record.issueDate < startDate) return false;
      if (endDate && record.issueDate > endDate) return false;

      // 4. Category & Bank
      if (selectedCategory && record.category !== selectedCategory) return false;
      if (selectedBank && !record.bankAccount?.toLowerCase().includes(selectedBank.toLowerCase())) return false;

      return textMatch;
    });
  }, [records, filterType, searchText, startDate, endDate, selectedCategory, selectedBank]);

  const availableCategories = useMemo(() => 
    Array.from(new Set(records.map(r => r.category))).sort()
  , [records]);

  const totalOriginal = filteredRecords.reduce((acc, r) => acc + r.originalValue, 0);
  const totalPaid = filteredRecords.reduce((acc, r) => acc + r.paidValue, 0);
  const totalPending = Math.max(0, totalOriginal - totalPaid);

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-2">
          <nav className="flex gap-4">
            <button onClick={() => setFilterType('all')} className={`pb-1 text-sm font-bold border-b-2 transition-colors ${filterType === 'all' ? 'border-primary-500 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              Histórico Geral
            </button>
            <button onClick={() => setFilterType('payable')} className={`pb-1 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${filterType === 'payable' ? 'border-rose-500 text-rose-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <ArrowDownCircle size={16} /> Saídas
            </button>
            <button onClick={() => setFilterType('receivable')} className={`pb-1 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${filterType === 'receivable' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <ArrowUpCircle size={16} /> Entradas
            </button>
          </nav>
          <button onClick={loadRealData} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded-full transition-all">
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
                type="text" 
                placeholder="Buscar por descrição, parceiro ou nota..." 
                value={searchText} 
                onChange={(e) => setSearchText(e.target.value)} 
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:outline-none bg-white text-slate-900 font-medium" 
            />
          </div>
          <div className="md:col-span-6 flex gap-2 items-center">
            <Calendar size={14} className="text-slate-400" />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none bg-white" />
            <span className="text-slate-400 font-bold">até</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none bg-white" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-2 border-t border-slate-100">
          <div className="relative">
            <Tags className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 appearance-none">
              <option value="">Todas Categorias</option>
              {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="relative">
            <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
                type="text" 
                placeholder="Filtrar Banco..." 
                value={selectedBank} 
                onChange={(e) => setSelectedBank(e.target.value)} 
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700"
            />
          </div>

          <div className="relative">
            <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)} className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 appearance-none font-medium">
              <option value="none">Sem Agrupamento</option>
              <option value="month">Agrupar por Mês</option>
              <option value="entity">Agrupar por Parceiro</option>
            </select>
          </div>

          <button 
            onClick={() => setIsPdfOpen(true)}
            className="flex items-center justify-center gap-2 text-sm font-bold text-white bg-slate-950 hover:bg-slate-800 px-4 py-2 rounded-lg transition-colors shadow-lg uppercase tracking-tighter italic"
          >
            <Printer size={16} /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-slate-400">
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Total Bruto Filtrado</p>
          <p className="text-xl font-black text-slate-800 mt-1">{currency(totalOriginal)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-[10px] text-emerald-600 uppercase font-black tracking-widest">Total Liquidado</p>
          <p className="text-xl font-black text-emerald-600 mt-1">{currency(totalPaid)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-rose-500">
          <p className="text-[10px] text-rose-600 uppercase font-black tracking-widest">Saldo em Aberto</p>
          <p className="text-xl font-black text-rose-600 mt-1">{currency(totalPending)}</p>
        </div>
      </div>

      <div className="min-h-[400px]">
        {filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 italic font-bold uppercase tracking-widest text-center">
                Nenhum lançamento financeiro encontrado.<br/>
                <span className="text-xs font-normal mt-2">Os saldos iniciais de conta aparecerão aqui conforme cadastrados.</span>
            </div>
        ) : (
            groupBy === 'none' ? (
                <FinancialTable 
                    records={filteredRecords} 
                    type="history"
                    onPay={(r) => setSelectedRecord(r)}
                />
            ) : (
                <HistoryGroupedList records={filteredRecords} groupBy={groupBy} />
            )
        )}
      </div>

      <FinancialPdfModal 
        isOpen={isPdfOpen} 
        onClose={() => setIsPdfOpen(false)}
        records={filteredRecords}
        groupBy={groupBy}
        filters={{ startDate, endDate, category: selectedCategory, bank: selectedBank }}
      />

      {selectedRecord && (
        <FinancialRecordDetailsModal 
            isOpen={!!selectedRecord}
            onClose={() => setSelectedRecord(null)}
            record={selectedRecord}
            onRefresh={loadRealData}
        />
      )}
    </div>
  );
};

export default HistoryTab;
