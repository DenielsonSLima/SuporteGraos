
import React, { useState, useMemo } from 'react';
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
import { FinancialRecord, FinancialStatus } from '../types';
import { useTransactionsByDateRange, useTransactionTotals } from '../../../hooks/useFinancialTransactions';
import { useAccounts } from '../../../hooks/useAccounts';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../hooks/queryKeys';
import type { FinancialTransaction } from '../../../services/financialTransactionsService';

const HistoryTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<'all' | 'payable' | 'receivable'>('all');

  // Filters
  const [searchText, setSearchText] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'month' | 'entity'>('none');

  // Modal State
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(null);

  // Data from hooks
  const { data: transactions = [], isLoading } = useTransactionsByDateRange(startDate, endDate);
  const { data: accounts = [] } = useAccounts();

  // Build account name lookup
  const accountNameMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach(acc => map.set(acc.id, acc.account_name));
    return map;
  }, [accounts]);

  // Adapter: FinancialTransaction → FinancialRecord
  const records = useMemo(() => {
    return transactions.map((tx: FinancialTransaction): FinancialRecord => {
      const isDebit = tx.type === 'debit';
      return {
        id: tx.id,
        description: tx.description || (isDebit ? 'Saída' : 'Entrada'),
        entityName: '',
        category: isDebit ? 'Débito' : 'Crédito',
        issueDate: tx.transaction_date,
        dueDate: tx.transaction_date,
        originalValue: tx.amount,
        paidValue: tx.amount,
        discountValue: 0,
        status: 'paid' as FinancialStatus,
        subType: isDebit ? 'admin' : 'receipt',
        bankAccount: accountNameMap.get(tx.account_id) || tx.account_id,
        notes: tx.entry_id ? `Entry: ${tx.entry_id}` : '',
      };
    }).sort((a, b) => {
      const dateA = new Date(a.issueDate || '').getTime();
      const dateB = new Date(b.issueDate || '').getTime();
      return dateB - dateA;
    });
  }, [transactions, accountNameMap]);

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions_date_range', startDate, endDate] });
  };

  const filteredRecords = useMemo(() => {
    const filtered = records.filter(record => {
      // 1. Tab Filter
      if (filterType === 'payable') {
        const isDebit = ['purchase_order', 'freight', 'commission', 'admin', 'loan_taken', 'shareholder'].includes(record.subType || '')
          || (record.subType === 'transfer' && record.notes?.startsWith('Saída:'));
        if (!isDebit) return false;
      } else if (filterType === 'receivable') {
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

      // 3. Category & Bank
      if (selectedCategory && record.category !== selectedCategory) return false;
      if (selectedBank && !record.bankAccount?.toLowerCase().includes(selectedBank.toLowerCase())) return false;

      return textMatch;
    });

    return filtered;
  }, [records, filterType, searchText, selectedCategory, selectedBank]);

  const availableCategories = useMemo(() =>
    Array.from(new Set(records.map(r => r.category))).sort()
    , [records]);

  // ✅ ZERO CÁLCULO NO FRONTEND — totais via RPC server-side
  const { data: totalsData } = useTransactionTotals(startDate, endDate);
  const totalInflow = totalsData?.totalInflow ?? 0;
  const totalOutflow = totalsData?.totalOutflow ?? 0;
  const totalNet = totalsData?.totalNet ?? 0;

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
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-[10px] text-emerald-600 uppercase font-black tracking-widest">Total de Entradas</p>
          <p className="text-xl font-black text-emerald-600 mt-1">{currency(totalInflow)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-rose-500">
          <p className="text-[10px] text-rose-600 uppercase font-black tracking-widest">Total de Saídas</p>
          <p className="text-xl font-black text-rose-600 mt-1">{currency(totalOutflow)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-slate-800">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Saldo Líquido (Período)</p>
          <p className={`text-xl font-black mt-1 ${totalNet >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
            {currency(totalNet)}
          </p>
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
            Nenhum lançamento financeiro encontrado.<br />
            <span className="text-xs font-normal mt-2">Os registros aparecerão aqui conforme operações financeiras forem realizadas.</span>
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
          onRefresh={refreshData}
        />
      )}
    </div>
  );
};

export default HistoryTab;
