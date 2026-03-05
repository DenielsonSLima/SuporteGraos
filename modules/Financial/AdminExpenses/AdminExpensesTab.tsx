
import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, Calendar, Tag, Layers } from 'lucide-react';
import AdminExpenseGroupedList from './components/AdminExpenseGroupedList';
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

// Lookup: subcategory_id → { name, type }
function buildCategoryLookup(cats: ExpenseCategory[]): Map<string, { name: string; type: string }> {
  const map = new Map<string, { name: string; type: string }>();
  cats.forEach(c => {
    (c.subtypes || []).forEach(s => {
      map.set(s.id, { name: s.name, type: c.type });
    });
  });
  return map;
}

// Adapter: AdminExpense (DB) → FinancialRecord (UI)
function toFinancialRecord(exp: AdminExpense, catLookup: Map<string, { name: string; type: string }>): FinancialRecord {
  const catInfo = catLookup.get(exp.category_id);
  return {
    id: exp.id,
    description: exp.description,
    entityName: exp.payee_name || 'DESPESA DIRETA',
    category: catInfo?.name || '',
    dueDate: exp.due_date || exp.expense_date,
    issueDate: exp.expense_date,
    settlementDate: exp.paid_date,
    originalValue: exp.amount,
    paidValue: exp.status === 'paid' ? exp.amount : 0,
    status: exp.status === 'open' ? 'pending' : exp.status === 'paid' ? 'paid' : 'pending',
    subType: 'admin',
    notes: '',
  };
}

const AdminExpensesTab: React.FC = () => {
  const { addToast } = useToast();
  const { data: adminExpenses = [] } = useAdminExpenses();
  const { data: expenseCategories = [] } = useExpenseCategories();
  const { createExpense, payExpense, refreshData } = useAdminExpenseOperations();

  const catLookup = useMemo(() => buildCategoryLookup(expenseCategories), [expenseCategories]);
  const records = useMemo(() => adminExpenses.map(e => toFinancialRecord(e, catLookup)), [adminExpenses, catLookup]);

  const categories = useMemo(() => {
    return expenseCategories
      .flatMap(c => (c.subtypes || []).map(s => s.name))
      .sort();
  }, [expenseCategories]);

  // UI State
  const [activeTab, setActiveTab] = useState<'open' | 'future' | 'all'>('open');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<FinancialRecord | null>(null);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleAddExpenses = async (newRecords: any[]) => {
    try {
      for (const record of newRecords) {
        // Busca o subcategory id pelo nome da categoria
        const subcatEntry = Array.from(catLookup.entries()).find(([, v]) => v.name === record.category);
        await createExpense({
          categoryId: subcatEntry?.[0] || undefined,
          description: record.description,
          amount: record.originalValue || record.paidValue || 0,
          payeeName: record.entityName,
          accountId: record.status === 'paid' ? record.bankAccount : undefined,
          expenseDate: record.issueDate || record.dueDate,
          dueDate: record.dueDate,
        });
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

  const handleEditRecord = (_record: FinancialRecord) => {
    addToast('info', 'Edição será implementada na próxima fase');
  };

  const handleDeleteRecord = (record: FinancialRecord) => {
    setDeletingRecord(record);
  };

  const confirmDeleteRecord = async () => {
    if (!deletingRecord) return;
    addToast('info', 'Exclusão não disponível - registros são imutáveis no novo sistema');
    setDeletingRecord(null);
  };

  // --- FILTERING & KPI CALCULATIONS ---
  const expenseRecords = useMemo(() => {
    return records.filter(r => r.subType === 'admin');
  }, [records]);

  const categoryTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    expenseCategories.forEach(d => (d.subtypes || []).forEach(s => map.set(s.name, d.type)));
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
          onEdit={handleEditRecord}
          onDelete={handleDeleteRecord}
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

      <ActionConfirmationModal
        isOpen={!!deletingRecord}
        onClose={() => setDeletingRecord(null)}
        onConfirm={confirmDeleteRecord}
        title="Excluir Despesa?"
        description={
          deletingRecord?.status === 'paid'
            ? 'Esta despesa já foi baixada. Ao excluir, o valor será estornado no caixa.'
            : 'Tem certeza que deseja excluir esta despesa?'
        }
        type="danger"
      />
    </div>
  );
};

export default AdminExpensesTab;
