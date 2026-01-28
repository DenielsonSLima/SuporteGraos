
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, Calendar, Tag, Layers, RefreshCw } from 'lucide-react';
import AdminExpenseGroupedList from './components/AdminExpenseGroupedList';
import InstallmentExpenseForm from './components/InstallmentExpenseForm';
import AdminExpensesKPIs from './components/AdminExpensesKPIs'; // Novo
import FinancialPaymentModal, { PaymentData } from '../components/modals/FinancialPaymentModal';
import { financialActionService } from '../../../services/financialActionService';
import { FinancialRecord } from '../types';
import { financialService } from '../../../services/financialService';

const AdminExpensesTab: React.FC = () => {
  // Data State
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'open' | 'future' | 'all'>('open');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(null);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = () => {
    setRecords(financialActionService.getStandaloneRecords());
    const cats = financialService.getExpenseCategories()
      .flatMap(c => c.subtypes.map(s => s.name))
      .sort();
    setCategories(cats);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddExpenses = (newRecords: any[]) => {
    newRecords.forEach(record => {
      financialActionService.addAdminExpense(record);
    });
    loadData();
  };

  const handleOpenPayment = (record: FinancialRecord) => {
    setSelectedRecord(record);
    setIsPayModalOpen(true);
  };

  const handleConfirmPayment = (data: PaymentData) => {
    if(!selectedRecord) return;
    financialActionService.processRecord(selectedRecord.id, data, 'admin');
    setIsPayModalOpen(false);
    loadData();
  };

  // --- FILTERING & KPI CALCULATIONS ---
  const expenseRecords = useMemo(() => {
      return records.filter(r => r.subType === 'admin' || r.category !== 'Venda de Ativo');
  }, [records]);

  const filteredRecords = useMemo(() => {
    return expenseRecords.filter(r => {
      const matchesSearch = 
        r.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.entityName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter ? r.category === categoryFilter : true;

      let matchesDate = true;
      if (startDate && r.dueDate < startDate) matchesDate = false;
      if (endDate && r.dueDate > endDate) matchesDate = false;

      let matchesTab = true;
      const today = new Date();
      const endOfMonthStr = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      
      if (activeTab === 'open') {
        const isPending = r.status !== 'paid';
        const isCurrentOrPast = r.dueDate <= endOfMonthStr;
        matchesTab = isPending && isCurrentOrPast;
      } else if (activeTab === 'future') {
        const isPending = r.status !== 'paid';
        const isFuture = r.dueDate > endOfMonthStr;
        matchesTab = isPending && isFuture;
      } 

      return matchesSearch && matchesCategory && matchesDate && matchesTab;
    });
  }, [expenseRecords, searchTerm, categoryFilter, startDate, endDate, activeTab]);

  const kpis = useMemo(() => {
      // KPIs baseados no filtro atual para dar contexto dinâmico
      const total = filteredRecords.reduce((acc, r) => acc + r.originalValue, 0);
      const paid = filteredRecords.reduce((acc, r) => acc + r.paidValue, 0);
      const pending = total - paid;
      return { total, paid, pending };
  }, [filteredRecords]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* KPIs Section */}
      <AdminExpensesKPIs {...kpis} />

      {/* HEADER CONTROLS */}
      <div className="flex flex-col gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar despesa, fornecedor..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-sm focus:bg-white focus:border-slate-800 focus:outline-none transition-all font-medium"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={loadData} className="p-2.5 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-xl transition-all border border-slate-100">
                <RefreshCw size={20} />
            </button>
            <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
                <Plus size={18} />
                Lançar Despesa
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-50">
          <div className="sm:col-span-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900 bg-white focus:border-slate-800 outline-none font-bold"
              />
            </div>
            <span className="text-slate-300 font-black text-[10px] uppercase">até</span>
            <div className="relative flex-1">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900 bg-white focus:border-slate-800 outline-none font-bold"
              />
            </div>
          </div>
          <div className="sm:col-span-2 relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900 bg-white focus:border-slate-800 outline-none appearance-none font-bold"
            >
              <option value="">Todas as Categorias</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('open')}
            className={`
              whitespace-nowrap border-b-4 py-4 px-1 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2
              ${activeTab === 'open' ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-400 hover:text-slate-600'}
            `}
          >
            <Filter size={16} />
            Para Pagar (Mês Atual)
          </button>
          <button
            onClick={() => setActiveTab('future')}
            className={`
              whitespace-nowrap border-b-4 py-4 px-1 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2
              ${activeTab === 'future' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}
            `}
          >
            <Calendar size={16} />
            Comprometimento Futuro
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`
              whitespace-nowrap border-b-4 py-4 px-1 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2
              ${activeTab === 'all' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}
            `}
          >
            <Layers size={16} />
            Histórico Consolidado
          </button>
        </nav>
      </div>

      {/* CONTENT AREA */}
      <div>
        <AdminExpenseGroupedList 
          records={filteredRecords} 
          onPay={handleOpenPayment} 
        />
      </div>

      {/* FORM MODAL */}
      <InstallmentExpenseForm 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddExpenses}
      />

      {/* PAYMENT MODAL */}
      <FinancialPaymentModal 
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onConfirm={handleConfirmPayment}
        record={selectedRecord}
      />
    </div>
  );
};

export default AdminExpensesTab;
