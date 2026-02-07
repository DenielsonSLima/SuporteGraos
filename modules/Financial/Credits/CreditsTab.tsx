import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { FinancialRecord } from '../types';
import CreditList from './components/CreditList.tsx';
import CreditFormModal from './components/CreditFormModal.tsx';
import ActionConfirmationModal from '../../../components/ui/ActionConfirmationModal';
import creditService from '../../../services/financial/creditService';
import { useToast } from '../../../contexts/ToastContext';

type TabType = 'current_month' | 'other_months';

const CreditsTab: React.FC = () => {
  const { addToast } = useToast();
  const [credits, setCredits] = useState<FinancialRecord[]>([]);
  const [editingCredit, setEditingCredit] = useState<FinancialRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<TabType>('current_month');
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'danger' | 'warning' | 'success';
    title: string;
    description: React.ReactNode;
    onConfirm: () => void;
  }>({
    isOpen: false,
    type: 'danger',
    title: '',
    description: null,
    onConfirm: () => {}
  });

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

  const filteredCredits = useMemo(() => {
    let result = credits;

    // Filtro por mês
    if (activeSubTab === 'current_month') {
      result = creditService.getCurrentMonthCredits();
    } else {
      result = creditService.getOtherMonthsCredits();
    }

    // Filtro por busca
    return result.filter(c =>
      (c.entityName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [credits, activeSubTab, searchTerm]);

  const handleCreateCredit = async (formData: any) => {
    try {
      const creditData = {
        id: `credit-${Date.now()}`,
        description: formData.description,
        entityName: formData.description,
        issueDate: formData.date,
        dueDate: formData.date,
        settlementDate: formData.date,
        originalValue: formData.value,
        paidValue: formData.value,
        status: 'paid' as const,
        subType: 'credit_income' as const,
        category: 'income',
        bankAccount: formData.accountId,
      };
      
      const newCredit = await creditService.create(creditData);

      if (newCredit) {
        addToast('success', 'Crédito lançado em conta!');
        setIsFormOpen(false);
        loadData();
      } else {
        addToast('error', 'Erro ao criar crédito');
      }
    } catch (err) {
      console.error('Erro ao criar crédito:', err);
      addToast('error', 'Erro ao criar crédito');
    }
  };

  const handleUpdateCredit = async (formData: any) => {
    if (!editingCredit) return;

    try {
      const updated = await creditService.update(editingCredit.id, {
        ...editingCredit,
        description: formData.description,
        entityName: formData.description,
        issueDate: formData.date,
        dueDate: formData.date,
        settlementDate: formData.date,
        originalValue: formData.value,
        paidValue: formData.value,
        bankAccount: formData.accountId,
      });

      if (updated) {
        addToast('success', 'Crédito atualizado com sucesso!');
        setIsFormOpen(false);
        setEditingCredit(null);
        loadData();
      }
    } catch (err) {
      addToast('error', 'Erro ao atualizar crédito');
    }
  };

  const handleDeleteCredit = async (credit: FinancialRecord) => {
    try {
      const success = await creditService.remove(credit.id);
      if (success) {
        addToast('success', 'Crédito removido com sucesso!');
        loadData();
      }
    } catch (err) {
      addToast('error', 'Erro ao remover crédito');
    }
  };

  const handleDeleteRequest = (credit: FinancialRecord) => {
    setActionModal({
      isOpen: true,
      type: 'danger',
      title: 'Excluir crédito',
      description: (
        <div className="space-y-2">
          <p>Tem certeza que deseja excluir este crédito?</p>
          <p className="text-sm text-slate-500">Essa ação não pode ser desfeita.</p>
        </div>
      ),
      onConfirm: async () => {
        await handleDeleteCredit(credit);
        setActionModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900">Outros Créditos</h3>
          <p className="text-sm text-slate-500">Outros créditos somente</p>
        </div>
        <button
          onClick={() => {
            setEditingCredit(null);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
        >
          <Plus size={18} />
          Novo Crédito
        </button>
      </div>

      {/* Abas de Período */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('current_month')}
          className={`px-4 py-3 font-bold text-sm tracking-wide transition-all ${
            activeSubTab === 'current_month'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Mês Atual
        </button>
        <button
          onClick={() => setActiveSubTab('other_months')}
          className={`px-4 py-3 font-bold text-sm tracking-wide transition-all ${
            activeSubTab === 'other_months'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Outros Meses
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Buscar crédito, descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-sm focus:bg-white focus:border-slate-800 focus:outline-none transition-all font-medium"
        />
      </div>

      {/* Tabela de Créditos */}
      <CreditList
        credits={filteredCredits}
        onEdit={(credit) => {
          setEditingCredit(credit);
          setIsFormOpen(true);
        }}
        onDelete={handleDeleteRequest}
        groupBy={activeSubTab === 'other_months' ? 'account_month' : 'none'}
      />

      {/* Modal de Formulário */}
      <CreditFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCredit(null);
        }}
        onSubmit={editingCredit ? handleUpdateCredit : handleCreateCredit}
        initialData={editingCredit}
      />
      <ActionConfirmationModal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={actionModal.onConfirm}
        title={actionModal.title}
        description={actionModal.description}
        type={actionModal.type}
      />
    </div>
  );
};

export default CreditsTab;
