import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, TrendingUp, DollarSign, Zap, Filter } from 'lucide-react';
import { FinancialRecord } from '../types';
import CreditKPIs from './components/CreditKPIs';
import CreditList from './components/CreditList';
import CreditDetails from './components/CreditDetails';
import CreditFormModal from './components/CreditFormModal';
import { creditService } from '../../../services/financial/creditService';
import { useToast } from '../../../contexts/ToastContext';
import { bankAccountService } from '../../../services/bankAccountService';

type TabType = 'current_month' | 'other_months';

const CreditsTab: React.FC = () => {
  const { addToast } = useToast();
  const [credits, setCredits] = useState<FinancialRecord[]>([]);
  const [selectedCreditId, setSelectedCreditId] = useState<string | null>(null);
  const [selectedCreditSnapshot, setSelectedCreditSnapshot] = useState<FinancialRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<TabType>('current_month');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'closed'>('all');

  const getBankAccountName = (bankAccountId?: string) => {
    if (!bankAccountId) return 'Não informada';
    const accounts = bankAccountService.getBankAccounts();
    const account = accounts.find(a => a.id === bankAccountId);
    return account?.bankName || bankAccountId;
  };

  const loadData = async () => {
    const data = await creditService.loadFromSupabase();
    const creditRecords: FinancialRecord[] = data
      .filter(record => ['credit_income', 'investment'].includes(record.subType || ''))
      .map(record => ({
        ...record,
        bankAccount: record.bankAccount,
      }));
    setCredits(creditRecords);
  };

  useEffect(() => {
    loadData();

    let debounceTimer: NodeJS.Timeout | null = null;

    const unsubscribe = creditService.subscribe((updatedRecords) => {
      if (debounceTimer) clearTimeout(debounceTimer);

      debounceTimer = setTimeout(() => {
        setCredits(prevCredits => {
          const creditRecords: FinancialRecord[] = updatedRecords
            .filter(record => ['credit_income', 'investment'].includes(record.subType || ''));

          if (JSON.stringify(prevCredits) !== JSON.stringify(creditRecords)) {
            return creditRecords;
          }
          return prevCredits;
        });
      }, 500);
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, []);

  const selectedCredit = useMemo(() =>
    credits.find(c => c.id === selectedCreditId) || selectedCreditSnapshot,
    [credits, selectedCreditId, selectedCreditSnapshot]
  );

  useEffect(() => {
    if (!selectedCreditId) return;
    const found = credits.find(c => c.id === selectedCreditId);
    if (found) setSelectedCreditSnapshot(found);
  }, [credits, selectedCreditId]);

  const filteredCredits = useMemo(() => {
    let result = credits;

    // Filtro por mês
    if (activeSubTab === 'current_month') {
      result = creditService.getCurrentMonthCredits();
    } else {
      result = creditService.getOtherMonthsCredits();
    }

    // Filtro por status
    if (filterStatus !== 'all') {
      result = result.filter(c => {
        if (filterStatus === 'active') {
          return c.status === 'pending' || c.status === 'partial';
        }
        return c.status === 'paid';
      });
    }

    // Filtro por busca
    return result.filter(c =>
      c.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [credits, activeSubTab, filterStatus, searchTerm]);

  const handleCreateCredit = async (formData: any) => {
    try {
      const newCredit = await creditService.create({
        id: `credit-${Date.now()}`,
        description: formData.description,
        entityName: formData.entityName,
        dueDate: formData.dueDate,
        issueDate: formData.issueDate,
        originalValue: formData.amount,
        paidValue: formData.interestRate || 0,
        status: 'pending',
        subType: formData.type || 'credit_income',
        category: 'crédito',
        bankAccount: formData.bankAccountId,
        notes: formData.notes,
      });

      if (newCredit) {
        addToast('Crédito criado com sucesso!', 'success');
        setIsFormOpen(false);
        loadData();
      } else {
        addToast('Erro ao criar crédito', 'error');
      }
    } catch (err) {
      console.error('Erro ao criar crédito:', err);
      addToast('Erro ao criar crédito', 'error');
    }
  };

  const handleUpdateCredit = async (formData: any) => {
    if (!selectedCredit) return;

    try {
      const updated = await creditService.update(selectedCredit.id, {
        ...selectedCredit,
        description: formData.description,
        entityName: formData.entityName,
        dueDate: formData.dueDate,
        issueDate: formData.issueDate,
        originalValue: formData.amount,
        paidValue: formData.interestRate || 0,
        notes: formData.notes,
      });

      if (updated) {
        addToast('Crédito atualizado com sucesso!', 'success');
        setIsFormOpen(false);
        loadData();
      }
    } catch (err) {
      addToast('Erro ao atualizar crédito', 'error');
    }
  };

  const handleDeleteCredit = async () => {
    if (!selectedCredit) return;

    try {
      const success = await creditService.remove(selectedCredit.id);
      if (success) {
        addToast('Crédito removido com sucesso!', 'success');
        setSelectedCreditId(null);
        loadData();
      }
    } catch (err) {
      addToast('Erro ao remover crédito', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900">Créditos & Investimentos</h3>
          <p className="text-sm text-slate-500">Gerencie suas aplicações financeiras e rendimentos</p>
        </div>
        <button
          onClick={() => {
            setSelectedCreditId(null);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg transition-all duration-200"
        >
          <Plus size={20} />
          Novo Crédito
        </button>
      </div>

      {/* KPIs */}
      <CreditKPIs credits={filteredCredits} />

      {/* Abas de Período */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('current_month')}
          className={`px-4 py-3 font-bold text-sm uppercase tracking-wider transition-all ${
            activeSubTab === 'current_month'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Mês Atual
        </button>
        <button
          onClick={() => setActiveSubTab('other_months')}
          className={`px-4 py-3 font-bold text-sm uppercase tracking-wider transition-all ${
            activeSubTab === 'other_months'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Outros Meses
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar crédito, instituição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              filterStatus === 'all'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              filterStatus === 'active'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ativos
          </button>
          <button
            onClick={() => setFilterStatus('closed')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              filterStatus === 'closed'
                ? 'bg-slate-100 text-slate-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Encerrados
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista */}
        <div className="lg:col-span-2">
          <CreditList credits={filteredCredits} onSelect={setSelectedCreditId} />
        </div>

        {/* Detalhes */}
        <div>
          {selectedCredit ? (
            <CreditDetails
              credit={selectedCredit}
              onEdit={() => setIsFormOpen(true)}
              onDelete={handleDeleteCredit}
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
              <DollarSign className="mx-auto mb-3 text-slate-300" size={40} />
              <p className="text-slate-500 font-medium">Selecione um crédito para visualizar detalhes</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Formulário */}
      <CreditFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={selectedCredit ? handleUpdateCredit : handleCreateCredit}
        initialData={selectedCredit}
      />
    </div>
  );
};

export default CreditsTab;
