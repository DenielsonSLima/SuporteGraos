
import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, Tag, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import AdminExpenseCardList from './components/AdminExpenseCardList';
import AdminExpenseQuickView from './components/AdminExpenseQuickView';
import InstallmentExpenseForm from './components/InstallmentExpenseForm';
import AdminExpensesKPIs from './components/AdminExpensesKPIs';
import FinancialPaymentModal, { PaymentData } from '../components/modals/FinancialPaymentModal';
import { useAdminExpenses } from '../../../hooks/useAdminExpenses';
import type { AdminExpense } from '../../../services/adminExpensesService';
import { useExpenseCategories } from '../../../hooks/useExpenseCategories';
import { FinancialRecord } from '../types';
import ActionConfirmationModal from '../../../components/ui/ActionConfirmationModal';
import { useToast } from '../../../contexts/ToastContext';
import type { ExpenseCategory } from '../../../services/expenseCategoryService';
import { useAdminExpenseOperations } from './hooks/useAdminExpenseOperations';
import { useBankAccounts } from '../../../hooks/useBankAccounts';

// Lookup: subcategory_id → { name, type, parentId }
function buildCategoryLookup(cats: ExpenseCategory[]): Map<string, { name: string; type: string; parentId: string }> {
  const map = new Map<string, { name: string; type: string; parentId: string }>();
  cats.forEach(c => {
    // Adiciona a própria categoria para permitir fallback/legado
    map.set(c.id, { name: c.name, type: c.type, parentId: c.id });
    
    (c.subtypes || []).forEach(s => {
      map.set(s.id, { name: s.name, type: c.type, parentId: c.id });
    });
  });
  return map;
}

// Adapter: AdminExpense (DB) → FinancialRecord (UI)
function toFinancialRecord(
  exp: AdminExpense, 
  catLookup: Map<string, { name: string; type: string; parentId: string }>,
  bankMap: Map<string, string>
): FinancialRecord {
  const catInfo = catLookup.get(exp.category_id);
  
  // Tenta recuperar o nome da subcategoria da descrição se estiver no formato "Subcategoria: Descrição"
  let displayCategory = catInfo?.name || '';
  let displayDescription = exp.description || '';
  
  if (displayDescription.includes(': ')) {
    const parts = displayDescription.split(': ');
    const subName = parts[0];
    // Verifica se subName corresponde a algum nome de subcategoria conhecido no lookup
    const isKnownSub = Array.from(catLookup.values()).some(v => v.name === subName);
    
    if (isKnownSub) {
      displayCategory = subName;
      displayDescription = parts.slice(1).join(': ');
    }
  }

  return {
    id: exp.id,
    description: displayDescription,
    entityName: exp.payee_name || 'DESPESA DIRETA',
    category: displayCategory,
    dueDate: exp.due_date || exp.expense_date,
    issueDate: exp.expense_date,
    settlementDate: exp.paid_date,
    originalValue: exp.amount,
    paidValue: exp.status === 'paid' ? exp.amount : 0,
    remainingValue: exp.status === 'paid' ? 0 : exp.amount,
    status: exp.status === 'open' ? 'pending' : exp.status === 'paid' ? 'paid' : 'pending',
    subType: (exp.sub_type as any) || 'admin',
    bankAccount: exp.account_id ? bankMap.get(exp.account_id) : undefined,
    notes: '',
  };
}

// Helper to format date string to "Month Name de Year" in Portuguese
const getMonthYearLabel = (dateStr?: string) => {
  if (!dateStr) return 'Sem Data';
  const [year, month] = dateStr.split('-');
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const monthIdx = parseInt(month, 10) - 1;
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${months[monthIdx]} de ${year}`;
  }
  return 'Sem Data';
};

const AdminExpensesTab: React.FC = () => {
  const { addToast } = useToast();
  const { data: adminExpenses = [] } = useAdminExpenses();
  const { data: expenseCategories = [] } = useExpenseCategories();
  const { data: bankAccounts = [] } = useBankAccounts();
  const { createExpense, payExpense, deleteExpense, updateExpense, reversePayment, refreshData } = useAdminExpenseOperations();

  const catLookup = useMemo(() => buildCategoryLookup(expenseCategories), [expenseCategories]);
  
  const bankMap = useMemo(() => {
    const map = new Map<string, string>();
    bankAccounts.forEach(b => map.set(b.id, b.bankName));
    return map;
  }, [bankAccounts]);

  const records = useMemo(() => adminExpenses.map(e => toFinancialRecord(e, catLookup, bankMap)), [adminExpenses, catLookup, bankMap]);

  const categories = useMemo(() => {
    return expenseCategories
      .flatMap(c => (c.subtypes || []).map(s => s.name))
      .sort();
  }, [expenseCategories]);

  // UI State
  const [activeTab, setActiveTab] = useState<'open' | 'future' | 'all'>('open');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(null);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Grouping State
  const [groupBy, setGroupBy] = useState<'type' | 'month'>('type');

  // Reset page on filter/tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, typeFilter, startDate, endDate, activeTab]);

  // Set groupBy to month automatically when selecting "Histórico Consolidado", and type otherwise
  useEffect(() => {
    if (activeTab === 'all') {
      setGroupBy('month');
    } else {
      setGroupBy('type');
    }
  }, [activeTab]);

  const handleAddExpenses = async (newRecords: any[]) => {
    try {
      for (const record of newRecords) {
        // Busca o subcategory id pelo nome da categoria
        const subcatEntry = Array.from(catLookup.entries()).find(([, v]) => v.name === record.category);
        const subcatData = subcatEntry?.[1];
        
        // No banco admin_expenses.category_id aponta para a CATEGORIA PAI (expense_categories.id)
        // Por isso enviamos o parentId do lookup.
        const expenseId = await createExpense({
          categoryId: subcatData?.parentId || undefined,
          description: record.category ? `${record.category}: ${record.description}` : record.description,
          amount: record.originalValue || record.paidValue || 0,
          payeeName: record.entityName,
          accountId: record.status === 'paid' ? record.bankAccount : undefined,
          expenseDate: record.issueDate || record.dueDate,
          dueDate: record.dueDate,
        });

        if (record.status === 'paid' && record.bankAccount) {
          await payExpense({
            entryOriginId: expenseId,
            accountId: record.bankAccount,
            amount: record.originalValue || record.paidValue || 0,
            description: `[Baixa Imediata] ${record.description}`
          });
        }
      }
      refreshData();
      addToast('success', 'Despesa(s) lançada(s) com sucesso');
    } catch (err: any) {
      addToast('error', 'Erro ao lançar despesa', err.message);
    }
  };

  const handleOpenPayment = (record: FinancialRecord) => {
    setSelectedRecord(record);
    setIsPayModalOpen(true);
  };

  const handleConfirmPayment = async (data: PaymentData) => {
    if (!selectedRecord) return;
    try {
      await payExpense({
        entryOriginId: selectedRecord.id,
        accountId: data.accountId,
        amount: data.amount ?? (selectedRecord.originalValue - selectedRecord.paidValue),
        discount: data.discount ?? 0,
        description: data.notes || `Pagamento: ${selectedRecord.description}`,
      });
      addToast('success', 'Pagamento Registrado', `Despesa "${selectedRecord.description}" baixada com sucesso.`);
    } catch (err: any) {
      addToast('error', 'Erro ao Registrar Pagamento', err.message);
    } finally {
      setIsPayModalOpen(false);
      setSelectedRecord(null);
      refreshData();
    }
  };

  const handleOpenQuickView = (record: FinancialRecord) => {
    setSelectedRecord(record);
    setIsQuickViewOpen(true);
  };

  const handleEditRecord = (record: FinancialRecord) => {
    setSelectedRecord(record);
    setIsQuickViewOpen(false);
    setIsAddModalOpen(true);
  };

  const handleDeleteRecord = (record: FinancialRecord) => {
    setSelectedRecord(record);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteRecord = async () => {
    if (!selectedRecord) return;
    try {
      await deleteExpense(selectedRecord.id);
      addToast('success', 'Despesa excluída com sucesso');
      setIsQuickViewOpen(false);
      refreshData();
    } catch (err: any) {
      addToast('error', 'Erro ao excluir despesa', err.message);
    } finally {
      setIsDeleteConfirmOpen(false);
      setSelectedRecord(null);
    }
  };

  const handleUpdateRecord = async (record: FinancialRecord) => {
    try {
      // Busca o subcategory id pelo nome da categoria
      const subcatEntry = Array.from(catLookup.entries()).find(([, v]) => v.name === record.category);
      const subcatData = subcatEntry?.[1];

      await updateExpense(record.id, {
        description: record.category ? `${record.category}: ${record.description}` : record.description,
        amount: record.originalValue,
        expenseDate: record.issueDate,
        dueDate: record.dueDate,
        payeeName: record.entityName,
        categoryId: subcatData?.parentId
      });

      refreshData();
      addToast('success', 'Despesa atualizada com sucesso');
      setIsAddModalOpen(false);
      setSelectedRecord(null);
    } catch (err: any) {
      addToast('error', 'Erro ao atualizar despesa', err.message);
    }
  };

  // --- FILTERING & KPI CALCULATIONS ---
  const expenseRecords = useMemo(() => {
    return records.filter(r => r.subType === 'admin');
  }, [records]);

  const categoryTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    // Mapeia nomes de subcategorias para o tipo (fixed/variable/administrative)
    expenseCategories.forEach(d => {
      // Também mapeia o nome da categoria mãe, para suportar registros cujo
      // category_id aponta para expense_categories (não subcategory)
      map.set(d.name, d.type);
      (d.subtypes || []).forEach(s => map.set(s.name, d.type));
    });
    return map;
  }, [expenseCategories]);

  const filteredCategories = useMemo(() => {
    if (!typeFilter) return categories;
    return categories.filter(cat => (categoryTypeMap.get(cat) || 'custom') === typeFilter);
  }, [categories, typeFilter, categoryTypeMap]);

  const filteredRecords = useMemo(() => {
    return expenseRecords.filter(r => {
      const matchesSearch =
        r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.entityName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = categoryFilter ? r.category === categoryFilter : true;
      const typeKey = categoryTypeMap.get(r.category) || 'custom';
      const matchesType = typeFilter ? typeKey === typeFilter : true;

      let matchesDate = true;
      if (startDate && r.dueDate < startDate) matchesDate = false;
      if (endDate && r.dueDate > endDate) matchesDate = false;

      let matchesTab = true;
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      const startOfMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const endOfMonthStr = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

      if (activeTab === 'open') {
        // Apenas registros do mês/ano atual
        const isCurrentMonth = r.dueDate >= startOfMonthStr && r.dueDate <= endOfMonthStr;
        matchesTab = isCurrentMonth;
      } else if (activeTab === 'future') {
        const isPending = r.status !== 'paid';
        const isFuture = r.dueDate > endOfMonthStr;
        matchesTab = isPending && isFuture;
      }

      return matchesSearch && matchesCategory && matchesType && matchesDate && matchesTab;
    });
  }, [expenseRecords, searchTerm, categoryFilter, typeFilter, startDate, endDate, activeTab, categoryTypeMap]);

  const kpis = useMemo(() => {
    // KPIs baseados no filtro atual para dar contexto dinâmico
    const total = filteredRecords.reduce((acc, r) => acc + r.originalValue, 0);
    const paid = filteredRecords.reduce((acc, r) => acc + r.paidValue, 0);
    const pending = total - paid;

    // Totais por tipo
    const fixed = filteredRecords
      .filter(r => (categoryTypeMap.get(r.category) || 'custom') === 'fixed')
      .reduce((acc, r) => acc + r.originalValue, 0);
    
    const administrative = filteredRecords
      .filter(r => (categoryTypeMap.get(r.category) || 'custom') === 'administrative')
      .reduce((acc, r) => acc + r.originalValue, 0);
    
    const variable = filteredRecords
      .filter(r => (categoryTypeMap.get(r.category) || 'custom') === 'variable')
      .reduce((acc, r) => acc + r.originalValue, 0);

    return { total, paid, pending, fixed, administrative, variable };
  }, [filteredRecords, categoryTypeMap]);

  const paginatedRecords = useMemo(() => {
    if (activeTab !== 'all') return filteredRecords;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage, activeTab]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredRecords.length / itemsPerPage);
  }, [filteredRecords, itemsPerPage]);

  const fullGroupTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredRecords.forEach(r => {
      if (groupBy === 'month') {
        const monthKey = r.dueDate ? r.dueDate.substring(0, 7) : '0000-00';
        totals[monthKey] = (totals[monthKey] || 0) + r.originalValue;
      } else {
        const type = categoryTypeMap.get(r.category) || 'custom';
        totals[type] = (totals[type] || 0) + r.originalValue;
      }
    });
    return totals;
  }, [filteredRecords, groupBy, categoryTypeMap]);

  const groupedRecords = useMemo(() => {
    const recordsToGroup = paginatedRecords;

    if (groupBy === 'month') {
      const groups: Record<string, { title: string; type: string; total: number; records: FinancialRecord[] }> = {};
      
      recordsToGroup.forEach(r => {
        const monthKey = r.dueDate ? r.dueDate.substring(0, 7) : '0000-00';
        if (!groups[monthKey]) {
          groups[monthKey] = {
            title: getMonthYearLabel(r.dueDate),
            type: monthKey,
            total: 0,
            records: []
          };
        }
        groups[monthKey].records.push(r);
      });
      
      // Assign the full group totals
      Object.keys(groups).forEach(key => {
        groups[key].total = fullGroupTotals[key] || 0;
      });

      // Sort keys descending (most recent month first)
      return Object.keys(groups)
        .sort((a, b) => b.localeCompare(a))
        .map(key => groups[key]);
    } else {
      const groups: Record<string, { title: string; type: string; total: number; records: FinancialRecord[] }> = {
        fixed: { title: 'Despesas Fixas', type: 'fixed', total: 0, records: [] },
        administrative: { title: 'Despesas Administrativas', type: 'administrative', total: 0, records: [] },
        variable: { title: 'Despesas Variáveis', type: 'variable', total: 0, records: [] },
        custom: { title: 'Outras Despesas', type: 'custom', total: 0, records: [] }
      };

      recordsToGroup.forEach(r => {
        const type = categoryTypeMap.get(r.category) || 'custom';
        if (groups[type]) {
          groups[type].records.push(r);
        } else {
          groups['custom'].records.push(r);
        }
      });

      // Assign the full group totals
      Object.keys(groups).forEach(type => {
        groups[type].total = fullGroupTotals[type] || 0;
      });

      return Object.values(groups).filter(g => g.records.length > 0);
    }
  }, [paginatedRecords, groupBy, fullGroupTotals, categoryTypeMap]);

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

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

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
              <Plus size={18} />
              Lançar Despesa
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 pt-4 border-t border-slate-50">
          <div className="sm:col-span-3 flex items-center gap-2">
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
          <div className="sm:col-span-1 relative">
            <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900 bg-white focus:border-slate-800 outline-none appearance-none font-bold"
            >
              <option value="">Todos os Tipos</option>
              <option value="fixed">Fixa</option>
              <option value="variable">Variável</option>
              <option value="administrative">Administrativa</option>
            </select>
          </div>
          <div className="sm:col-span-1 relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900 bg-white focus:border-slate-800 outline-none appearance-none font-bold"
            >
              <option value="">Todas as Categorias</option>
              {filteredCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <nav className="-mb-px flex space-x-8 overflow-x-auto scrollbar-none">
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

        {activeTab === 'all' && (
          <div className="flex items-center gap-3 pb-3 md:pb-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Agrupar por:</span>
            <div className="inline-flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setGroupBy('month')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  groupBy === 'month' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Mês
              </button>
              <button
                type="button"
                onClick={() => setGroupBy('type')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  groupBy === 'type' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Tipo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CONTENT AREA */}
      <div className="space-y-12">
        {groupedRecords.map(group => (
          <div key={group.type} className="space-y-6">
            <div className="flex items-center gap-4">
              <div className={`h-8 w-1.5 rounded-full ${
                groupBy === 'month' ? 'bg-slate-900' :
                group.type === 'fixed' ? 'bg-blue-600' : 
                group.type === 'administrative' ? 'bg-slate-600' : 
                group.type === 'variable' ? 'bg-amber-600' : 'bg-slate-400'
              }`} />
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{group.title}</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">
                  {groupBy === 'month' ? `Subtotal: ${currency(group.total)}` : `Total: ${currency(group.total)}`}
                </span>
              </div>
            </div>
            
            <AdminExpenseCardList
              records={group.records}
              onSelect={handleOpenQuickView}
              onPay={handleOpenPayment}
              onEdit={handleEditRecord}
              onDelete={handleDeleteRecord}
            />
          </div>
        ))}

        {groupedRecords.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="p-4 bg-white rounded-2xl shadow-sm inline-block mb-4 text-slate-300">
              <Layers size={40} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Nenhuma despesa encontrada</h3>
            <p className="text-slate-500 text-sm">Tente ajustar seus filtros para encontrar o que procura.</p>
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {activeTab === 'all' && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mt-6">
            {/* Info */}
            <div className="text-xs font-bold text-slate-500">
              Exibindo <span className="text-slate-800 font-black">
                {Math.min((currentPage - 1) * itemsPerPage + 1, filteredRecords.length)}
              </span> a <span className="text-slate-800 font-black">
                {Math.min(currentPage * itemsPerPage, filteredRecords.length)}
              </span> de <span className="text-slate-800 font-black">
                {filteredRecords.length}
              </span> despesas
            </div>

            {/* Navigation & Page Size */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Exibir:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 focus:border-slate-800 outline-none cursor-pointer"
                >
                  <option value={12}>12 por página</option>
                  <option value={24}>24 por página</option>
                  <option value={48}>48 por página</option>
                </select>
              </div>

              {/* Page Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent text-slate-600 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Render dynamic page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - currentPage) <= 1
                  ) {
                    return (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          currentPage === page
                            ? 'bg-slate-900 text-white font-black'
                            : 'border border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  }
                  
                  if (
                    page === 2 ||
                    page === totalPages - 1
                  ) {
                    return (
                      <span key={page} className="px-1 text-slate-400 text-xs select-none">
                        ...
                      </span>
                    );
                  }

                  return null;
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent text-slate-600 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AdminExpenseQuickView
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        record={selectedRecord}
        onPay={handleOpenPayment}
        onEdit={handleEditRecord}
        onDelete={handleDeleteRecord}
        onReversePayment={async (txId: string) => {
          try {
            await reversePayment(txId);
            addToast('success', 'Pagamento revertido com sucesso');
            refreshData();
          } catch (err: any) {
            addToast('error', 'Erro ao reverter pagamento', err.message);
          }
        }}
      />

      {/* FORM MODAL */}
      <InstallmentExpenseForm
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setSelectedRecord(null); }}
        onSave={handleAddExpenses}
        onUpdate={handleUpdateRecord}
        initialData={selectedRecord}
      />

      {/* PAYMENT MODAL */}
      <FinancialPaymentModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onConfirm={handleConfirmPayment}
        record={selectedRecord}
      />

      <ActionConfirmationModal 
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteRecord}
        title="Excluir Despesa"
        description={
          <>
            Tem certeza que deseja excluir a despesa <span className="font-black">"{selectedRecord?.description}"</span>?
            <br />
            Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        type="danger"
      />

    </div>
  );
};

export default AdminExpensesTab;
