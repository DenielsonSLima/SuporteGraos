
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
import { transfersService } from '../../../services/financial/transfersService';
import { loansService } from '../../../services/financial/loansService';
import { financialService } from '../../../services/financialService';
import { partnerService } from '../../../services/partnerService';
import { shareholderService } from '../../../services/shareholderService';
import { waitForInit } from '../../../services/supabaseInitService';
import { standaloneRecordsService } from '../../../services/standaloneRecordsService';

const HistoryTab: React.FC = () => {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'payable' | 'receivable'>('all');
  const cursorDateRef = React.useRef<string | null>(null);
  
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

  const PAGE_SIZE = 30;

  // ✅ Log quando o componente monta
  useEffect(() => {
    console.log('📋 HistoryTab montado - aguardando dados...');
  }, []);

  const resolveRecordDate = (record: FinancialRecord & { date?: string }): string =>
    record.issueDate || record.dueDate || record.date || '';

  const resolveRecordTimestamp = (record: FinancialRecord & { date?: string }) => {
    const date = resolveRecordDate(record);
    return date ? new Date(date).getTime() : 0;
  };

  const mergeRecords = (base: FinancialRecord[], incoming: FinancialRecord[]) => {
    const merged = new Map<string, FinancialRecord>();
    base.forEach(item => merged.set(item.id, item));
    incoming.forEach(item => merged.set(item.id, item));
    return Array.from(merged.values());
  };

  const sortRecords = (items: FinancialRecord[]) =>
    items.sort((a, b) => {
      const dateA = resolveRecordTimestamp(a);
      const dateB = resolveRecordTimestamp(b);
      const dateCompare = dateB - dateA;
      return dateCompare !== 0 ? dateCompare : b.id.localeCompare(a.id);
    });

  const getOldestRecordDate = (items: FinancialRecord[]) => {
    if (items.length === 0) return null;
    return items.reduce((oldest, item) => {
      const date = resolveRecordDate(item);
      if (!date) return oldest;
      if (!oldest) return date;
      return date < oldest ? date : oldest;
    }, null as string | null);
  };

  // --- CARREGAMENTO DE DADOS CONSOLIDADO COM DEBOUNCE ---
  const loadRealData = useCallback(async (options?: { reset?: boolean }) => {
    const reset = options?.reset ?? false;
    // ✅ EVITAR múltiplas chamadas simultâneas
    if (loadingRef.current) {
      console.log('⏳ Carregamento já em progresso, ignorando...');
      return;
    }

    loadingRef.current = true;
    if (reset) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      const mapPayables = (payablesRaw: any[]): FinancialRecord[] => payablesRaw.map(p => ({
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

      const mapReceivables = (receivablesRaw: any[]): FinancialRecord[] => receivablesRaw.map(r => {
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

      const mapInitialBalances = (balances: any[]): FinancialRecord[] => balances.map(b => ({
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

      const mapTransferRecords = (transfers: any[]): FinancialRecord[] => {
        const records: FinancialRecord[] = [];
        
        console.log(`🔄 mapTransferRecords chamada com ${transfers.length} transferências`);
        
        transfers.forEach(t => {
          const fromAccount = financialService.getBankAccountsWithBalances().find(a => a.id === t.fromAccountId);
          const toAccount = financialService.getBankAccountsWithBalances().find(a => a.id === t.toAccountId);
          
          // DÉBITO: saída da conta de origem
          records.push({
            id: `transfer-debit-${t.id}`,
            description: t.description,
            entityName: toAccount?.bankName || 'Conta Destino',
            category: 'Transferências',
            issueDate: t.transferDate,
            dueDate: t.transferDate,
            originalValue: t.amount,
            paidValue: t.amount,
            status: 'paid' as const,
            subType: 'transfer' as const,
            bankAccount: fromAccount?.bankName,
            notes: `Saída: ${fromAccount?.bankName || 'Conta'} → ${toAccount?.bankName || 'Conta'}`
          });
          
          // CRÉDITO: entrada na conta de destino
          records.push({
            id: `transfer-credit-${t.id}`,
            description: t.description,
            entityName: fromAccount?.bankName || 'Conta Origem',
            category: 'Transferências',
            issueDate: t.transferDate,
            dueDate: t.transferDate,
            originalValue: t.amount,
            paidValue: t.amount,
            status: 'paid' as const,
            subType: 'transfer' as const,
            bankAccount: toAccount?.bankName,
            notes: `Entrada: ${fromAccount?.bankName || 'Conta'} → ${toAccount?.bankName || 'Conta'}`
          });
        });
        
        console.log(`✅ mapTransferRecords criou ${records.length} registros (${records.filter(r => r.notes?.startsWith('Saída:')).length} saídas, ${records.filter(r => r.notes?.startsWith('Entrada:')).length} entradas)`);
        return records;
      };

      const mapShareholderRecords = () => {
        const shareholders = shareholderService.getAll();
        return shareholders.flatMap(s => {
          const mapped = s.financial.history.map(t => {
            const isCredit = t.type === 'credit';
            return {
              id: `shareholder-${t.id}`,
              description: t.description,
              entityName: s.name,
              category: 'Sócios',
              issueDate: t.date,
              dueDate: t.date,
              originalValue: t.value,
              paidValue: isCredit ? 0 : t.value,
              status: isCredit ? 'pending' : 'paid',
              subType: 'shareholder' as const,
              bankAccount: t.accountId,
              notes: isCredit ? 'Saldo de sócio (a pagar)' : 'Pagamento ao sócio'
            };
          });

          const totalCredits = s.financial.history
            .filter(t => t.type === 'credit')
            .reduce((acc, t) => acc + t.value, 0);
          const totalDebits = s.financial.history
            .filter(t => t.type === 'debit')
            .reduce((acc, t) => acc + t.value, 0);
          const netFromHistory = totalCredits - totalDebits;
          const diff = (s.financial.currentBalance || 0) - netFromHistory;

          if (Math.abs(diff) > 0.01) {
            const issueDate = s.financial.lastProLaboreDate || new Date().toISOString().split('T')[0];
            mapped.unshift({
              id: `shareholder-balance-${s.id}`,
              description: 'Saldo atual do sócio (ajuste)',
              entityName: s.name,
              category: 'Sócios',
              issueDate,
              dueDate: issueDate,
              originalValue: Math.abs(diff),
              paidValue: 0,
              status: 'pending' as const,
              subType: 'shareholder' as const,
              bankAccount: undefined,
              notes: 'Ajuste para refletir saldo atual'
            });
          }

          return mapped;
        });
      };

      const mapLoans = (loans: any[]): FinancialRecord[] => {
        const records: FinancialRecord[] = [];
        
        loans.forEach(loan => {
          // Empréstimo TOMADO: cria CRÉDITO (entrada) + DÉBITO (obrigação)
          if (loan.subType === 'loan_taken') {
            // CRÉDITO: Valor que entrou na conta
            records.push({
              id: `${loan.id}-credit`,
              description: `CRÉDITO DE EMPRÉSTIMO: ${loan.entityName}`,
              entityName: loan.entityName || 'N/A',
              category: 'Crédito de Empréstimo',
              issueDate: loan.issueDate,
              dueDate: loan.issueDate,
              originalValue: loan.originalValue || 0,
              paidValue: loan.originalValue || 0, // Já foi creditado
              status: 'paid' as const,
              subType: 'receipt' as const,
              bankAccount: loan.bankAccount,
              notes: 'Crédito do empréstimo tomado'
            });
            
            // DÉBITO: Obrigação de pagamento (valor pendente) - SEM conta bancária
            const remaining = (loan.originalValue || 0) - (loan.paidValue || 0);
            records.push({
              id: `${loan.id}-debit`,
              description: `OBRIGAÇÃO - AMORTIZAR: ${loan.entityName}`,
              entityName: loan.entityName || 'N/A',
              category: 'Obrigação de Empréstimo',
              issueDate: loan.issueDate,
              dueDate: loan.dueDate || loan.issueDate,
              originalValue: loan.originalValue || 0,
              paidValue: loan.paidValue || 0, // Quanto já foi pago
              status: remaining <= 0.01 ? 'paid' : (loan.paidValue || 0) > 0 ? 'partial' : 'pending',
              subType: 'admin' as const,
              bankAccount: undefined, // SEM conta - é uma obrigação, não transação real
              notes: remaining <= 0.01 ? 'Empréstimo quitado' : `Pendente para amortizar: R$ ${remaining.toFixed(2)}`
            });
          }
          // Empréstimo CONCEDIDO: cria DÉBITO (saída) + CRÉDITO (a receber)
          else if (loan.subType === 'loan_granted') {
            // DÉBITO: Valor que saiu da conta
            records.push({
              id: `${loan.id}-debit`,
              description: `DÉBITO DE EMPRÉSTIMO CONCEDIDO: ${loan.entityName}`,
              entityName: loan.entityName || 'N/A',
              category: 'Débito de Empréstimo',
              issueDate: loan.issueDate,
              dueDate: loan.issueDate,
              originalValue: loan.originalValue || 0,
              paidValue: loan.originalValue || 0, // Já foi debitado
              status: 'paid' as const,
              subType: 'admin' as const,
              bankAccount: loan.bankAccount,
              notes: 'Débito do empréstimo concedido'
            });
            
            // CRÉDITO: Direito de recebimento (valor a receber) - SEM conta
            const remainingReceive = (loan.originalValue || 0) - (loan.paidValue || 0);
            records.push({
              id: `${loan.id}-credit`,
              description: `DIREITO DE RECEBER: ${loan.entityName}`,
              entityName: loan.entityName || 'N/A',
              category: 'Direito de Recebimento',
              issueDate: loan.issueDate,
              dueDate: loan.dueDate || loan.issueDate,
              originalValue: loan.originalValue || 0,
              paidValue: loan.paidValue || 0, // Quanto já foi recebido
              status: remainingReceive <= 0.01 ? 'paid' : (loan.paidValue || 0) > 0 ? 'partial' : 'pending',
              subType: 'receipt' as const,
              bankAccount: undefined, // SEM conta - é um direito, não transação real
              notes: remainingReceive <= 0.01 ? 'Empréstimo recebido' : `Pendente para receber: R$ ${remainingReceive.toFixed(2)}`
            });
          }
        });
        
        return records;
      };
      await waitForInit();

      const pageCursor = reset ? undefined : cursorDateRef.current || undefined;
      const pageOptions = {
        limit: PAGE_SIZE,
        beforeDate: pageCursor,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };

      const [payablesRaw, receivablesRaw, standalone, standaloneRecords, transfersRaw, loansRaw] = await Promise.all([
        payablesService.fetchPage(pageOptions),
        receivablesService.fetchPage(pageOptions),
        financialHistoryService.fetchPage(pageOptions),
        standaloneRecordsService.fetchPage(pageOptions),
        transfersService.fetchPage(pageOptions),
        loansService.fetchPage(pageOptions)
      ]);

      const initialBalances = reset ? mapInitialBalances(financialService.getInitialBalances()) : [];
      const shareholderRecords = reset ? mapShareholderRecords() : [];

      const pageRecords: FinancialRecord[] = [
        ...mapPayables(payablesRaw),
        ...mapReceivables(receivablesRaw),
        ...standalone as unknown as FinancialRecord[],
        ...standaloneRecords,
        ...mapTransferRecords(transfersRaw),
        ...mapLoans(loansRaw),
        ...initialBalances,
        ...shareholderRecords
      ];

      setRecords(prev => {
        const merged = reset ? pageRecords : mergeRecords(prev, pageRecords);
        const sorted = sortRecords(merged);
        cursorDateRef.current = getOldestRecordDate(sorted);
        return sorted;
      });

      const hasMorePage = [
        payablesRaw.length,
        receivablesRaw.length,
        standalone.length,
        standaloneRecords.length,
        transfersRaw.length,
        loansRaw.length
      ].some(count => count === PAGE_SIZE);

      setHasMore(hasMorePage);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [endDate, startDate]);

  useEffect(() => {
    const initRealtime = async () => {
      await waitForInit();
      payablesService.startRealtime();
      receivablesService.startRealtime();
      financialHistoryService.startRealtime();
      transfersService.startRealtime();
      loansService.startRealtime();
      shareholderService.startRealtime();
    };

    void initRealtime();
    loadRealData({ reset: true });
    
    // ✅ DEBOUNCE nas subscriptions para evitar atualizações muito frequentes
    const debouncedLoad = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        console.log('🔄 Atualizando histórico...');
        loadRealData({ reset: true });
      }, 2000); // 2 segundos para evitar recargas desnecessárias
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
    const unsubTransfers = transfersService.subscribe(() => {
      console.log('🔔 REALTIME: Transfers atualizado!');
      debouncedLoad();
    });
    const unsubLoans = loansService.subscribe(() => {
      console.log('🔔 REALTIME: Loans atualizado!');
      debouncedLoad();
    });
    const unsubShareholders = shareholderService.subscribe(() => {
      console.log('🔔 REALTIME: Shareholders atualizado!');
      debouncedLoad();
    });

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      unsubPayables();
      unsubReceivables();
      unsubHistory();
      unsubTransfers();
      unsubLoans();
      unsubShareholders();
    };
  }, [loadRealData]);

  // ✅ ESCUTA eventos do window para sincronização de transferências
  useEffect(() => {
    const handleFinancialUpdate = () => {
      console.log('💰 Evento financeiro disparado - recarregando...');
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        loadRealData({ reset: true });
      }, 2000); // Aumentado para 2s para evitar recargas muito frequentes
    };

    window.addEventListener('financial:updated', handleFinancialUpdate);
    window.addEventListener('data:updated', handleFinancialUpdate);

    return () => {
      window.removeEventListener('financial:updated', handleFinancialUpdate);
      window.removeEventListener('data:updated', handleFinancialUpdate);
    };
  }, [loadRealData]);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setHasMore(true);
      cursorDateRef.current = null;
      loadRealData({ reset: true });
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [startDate, endDate, loadRealData]);

  const filteredRecords = useMemo(() => {
    const filtered = records.filter(record => {
      // 1. Tab Filter
      if (filterType === 'payable') {
        // DÉBITOS: saídas de dinheiro
        const isDebit = ['purchase_order', 'freight', 'commission', 'admin', 'loan_taken', 'shareholder'].includes(record.subType || '') 
          || (record.subType === 'transfer' && record.notes?.startsWith('Saída:'));
        if (!isDebit) return false;
      } else if (filterType === 'receivable') {
        // CRÉDITOS: entradas de dinheiro
        const isCredit = ['sales_order', 'loan_granted', 'receipt'].includes(record.subType || '') 
          || record.category === 'Saldo Inicial' 
          || record.category === 'Venda de Ativo'
          || (record.subType === 'transfer' && record.notes?.startsWith('Entrada:'));
        if (!isCredit) return false;
      }

      // 2. Search
      const searchLower = searchText.toLowerCase();
      const textMatch = 
        record.description.toLowerCase().includes(searchLower) || 
        record.entityName.toLowerCase().includes(searchLower) ||
        record.notes?.toLowerCase().includes(searchLower);

      // 3. Date Range
      const recordDate = resolveRecordDate(record);
      if (startDate && (!recordDate || recordDate < startDate)) return false;
      if (endDate && (!recordDate || recordDate > endDate)) return false;

      // 4. Category & Bank
      if (selectedCategory && record.category !== selectedCategory) return false;
      if (selectedBank && !record.bankAccount?.toLowerCase().includes(selectedBank.toLowerCase())) return false;

      return textMatch;
    });
    
    if (filterType !== 'all') {
      const transferCount = filtered.filter(r => r.subType === 'transfer').length;
      console.log(`📊 FILTERED (${filterType}): ${filtered.length} registros (${transferCount} transferências)`);
    }
    
    return filtered;
  }, [records, filterType, searchText, startDate, endDate, selectedCategory, selectedBank]);

  const availableCategories = useMemo(() => 
    Array.from(new Set(records.map(r => r.category))).sort()
  , [records]);

  const totalOriginal = filteredRecords.reduce((acc, r) => acc + r.originalValue, 0);
  const totalPaid = filteredRecords.reduce((acc, r) => acc + r.paidValue, 0);
  const totalPending = Math.max(0, totalOriginal - totalPaid);

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

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
          <button onClick={() => loadRealData({ reset: true })} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded-full transition-all">
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

      <div className="min-h-[400px] relative">
        {isLoading && filteredRecords.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white border-2 border-slate-200 rounded-2xl">
            <div className="animate-spin">
              <RefreshCw className="text-slate-400" size={24} />
            </div>
            <p className="mt-4 text-slate-500 font-medium">Carregando histórico...</p>
          </div>
        )}
        
        {!isLoading && filteredRecords.length === 0 ? (
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

      {filteredRecords.length > 0 && (
        <div className="flex items-center justify-center">
          <button
            onClick={() => loadRealData({ reset: false })}
            disabled={!hasMore || isLoadingMore}
            className="px-6 py-2 rounded-lg text-sm font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {isLoadingMore ? 'Carregando...' : hasMore ? 'Carregar mais' : 'Sem mais resultados'}
          </button>
        </div>
      )}

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
            onRefresh={() => loadRealData({ reset: true })}
        />
      )}
    </div>
  );
};

export default HistoryTab;
