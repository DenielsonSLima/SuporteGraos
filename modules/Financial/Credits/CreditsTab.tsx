import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, TrendingUp, Filter, Layers, Calendar, X } from 'lucide-react';
import { useCredits, useCreateCredit, useUpdateCredit, useDeleteCredit } from '../../../hooks/useCredits';
import CreditList from './components/CreditList';
import CreditFormModal from './components/CreditFormModal';
import ModalPortal from '../../../components/ui/ModalPortal';
import { useToast } from '../../../contexts/ToastContext';
import type { FinancialRecord } from '../../../modules/Financial/types';

const CreditsTab: React.FC = () => {
  const { addToast } = useToast();
  
  // UI Tabs / Filters
  const [activeSubTab, setActiveSubTab] = useState<'current_month' | 'history'>('current_month');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState<FinancialRecord | null>(null);
  const [deletingCredit, setDeletingCredit] = useState<FinancialRecord | null>(null);

  // Pagination
  const PAGE_SIZE = 100;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // TanStack Query
  const { data: credits = [], isLoading } = useCredits();
  const createCreditMutation = useCreateCredit();
  const updateCreditMutation = useUpdateCredit();
  const deleteCreditMutation = useDeleteCredit();

  // Mês Atual helpers
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const startOfMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const endOfMonthStr = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

  const filteredCredits = useMemo(() => {
    let result = credits;

    if (activeSubTab === 'current_month') {
      result = result.filter(r => {
        const d = r.issueDate || r.dueDate || '';
        return d >= startOfMonthStr && d <= endOfMonthStr;
      });
    }

    if (activeSubTab === 'history') {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(r => {
        const d = r.issueDate || r.dueDate || '';
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        if (searchTerm) {
          return r.description.toLowerCase().includes(searchLower) || 
                 (r.entityName && r.entityName.toLowerCase().includes(searchLower));
        }
        return true;
      });
    }

    return result;
  }, [credits, activeSubTab, searchTerm, startDate, endDate, startOfMonthStr, endOfMonthStr]);

  const paginatedRecords = useMemo(() => {
    if (activeSubTab !== 'history') return filteredCredits;
    return filteredCredits.slice(0, visibleCount);
  }, [filteredCredits, activeSubTab, visibleCount]);

  const hasMore = activeSubTab === 'history' && filteredCredits.length > visibleCount;

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [startDate, endDate, searchTerm, activeSubTab]);

  const totalCreditsValue = useMemo(() => {
    return filteredCredits.reduce((acc, c) => acc + (c.originalValue || 0), 0);
  }, [filteredCredits]);

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  const handleSubmit = async (data: any) => {
    try {
      if (editingCredit) {
        // Update existing credit
        await updateCreditMutation.mutateAsync({
          id: editingCredit.id,
          data: {
            description: data.description,
            amount: data.value,
            date: data.date,
          },
        });
        addToast('success', 'Crédito atualizado com sucesso!');
        setEditingCredit(null);
      } else {
        // Create new credit
        await createCreditMutation.mutateAsync({
          description: data.description,
          amount: data.value,
          date: data.date,
          accountId: data.accountId,
          accountName: data.accountName,
        });
        addToast('success', 'Crédito lançado com sucesso!');
      }
    } catch (err: any) {
      addToast('error', 'Erro ao salvar crédito', err.message);
    }
  };

  const handleEdit = (credit: FinancialRecord) => {
    setEditingCredit(credit);
    setIsFormOpen(true);
  };

  const handleDelete = (credit: FinancialRecord) => {
    setDeletingCredit(credit);
  };

  const confirmDelete = async () => {
    if (!deletingCredit) return;
    try {
      await deleteCreditMutation.mutateAsync(deletingCredit.id);
      addToast('success', 'Crédito excluído com sucesso!');
    } catch (err: any) {
      addToast('error', 'Erro ao excluir crédito', err.message);
    } finally {
      setDeletingCredit(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Premium Sub-navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex gap-2 p-1.5 bg-slate-100/80 backdrop-blur-md rounded-2xl border border-slate-200/50 shadow-inner w-full sm:w-fit">
          <button
            onClick={() => setActiveSubTab('current_month')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all duration-300 ${activeSubTab === 'current_month' ? 'bg-white text-emerald-600 shadow-xl shadow-emerald-900/5' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
          >
            <Filter size={16} /> Mês Atual
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all duration-300 ${activeSubTab === 'history' ? 'bg-slate-900 text-white shadow-xl shadow-black/20' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
          >
            <Layers size={16} /> Histórico Geral
          </button>
        </div>
        
        <button
          onClick={() => { setEditingCredit(null); setIsFormOpen(true); }}
          className="bg-emerald-600 text-white px-8 py-3.5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 hover:scale-[1.02] hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          <Plus size={18} /> Novo Crédito
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500 animate-in slide-in-from-left-5">
          <p className="text-[10px] text-emerald-600 uppercase font-black tracking-widest flex items-center gap-1.5 mb-1"><TrendingUp size={14}/> Entradas Neste Filtro</p>
          <p className="text-2xl font-black text-emerald-600 tracking-tighter">{currency(totalCreditsValue)}</p>
        </div>
      </div>

      {/* Visão Geral Filter & Search (apenas aba 'history') */}
      {activeSubTab === 'history' && (
        <div className="bg-white/80 backdrop-blur-xl p-3 rounded-[2.5rem] border border-slate-200/60 shadow-2xl shadow-slate-200/50 animate-in slide-in-from-top-5 duration-500">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
            <div className="relative flex-1 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Pesquisar por crédito..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-4 rounded-[1.8rem] border border-slate-100 bg-slate-50 text-sm font-black text-slate-800 placeholder:text-slate-400/80 placeholder:font-bold focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all shadow-inner"
              />
            </div>

            <div className="flex items-center gap-4 bg-slate-50/50 p-2 rounded-[1.8rem] border border-slate-100">
              <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200/50 shadow-sm">
                <Calendar size={18} className="text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-32 text-xs border-none focus:ring-0 bg-transparent text-slate-700 font-black p-0 uppercase tracking-tighter"
                />
                <span className="text-slate-300 font-black text-[10px] uppercase tracking-widest">Até</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-32 text-xs border-none focus:ring-0 bg-transparent text-slate-700 font-black p-0 uppercase tracking-tighter"
                />
                {(startDate || endDate) && (
                  <button
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="ml-2 bg-rose-50 hover:bg-rose-500 p-1.5 rounded-xl text-rose-500 hover:text-white transition-all shadow-sm"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {(startDate || endDate || searchTerm) && (
            <div className="px-6 py-2 flex justify-end">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] italic">
                Exibindo {filteredCredits.length} entrada{filteredCredits.length !== 1 ? 's' : ''} localizada{filteredCredits.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-emerald-500 animate-spin" />
        </div>
      ) : (
        <div className="animate-in slide-in-from-bottom-5 duration-700">
          <CreditList 
            credits={paginatedRecords} 
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* Paginação Histórico */}
      {activeSubTab === 'history' && filteredCredits.length > 0 && (
        <div className="flex flex-col items-center gap-3 py-10">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
            Exibindo {paginatedRecords.length} de {filteredCredits.length} registros
          </span>
          {hasMore && (
            <button
              onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
              className="px-12 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] border-2 border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-xl active:scale-95"
            >
              Carregar Mais Resultados
            </button>
          )}
        </div>
      )}

      {/* Modal de Formulário (Criar / Editar) */}
      {isFormOpen && (
        <CreditFormModal
          isOpen={isFormOpen}
          onClose={() => { setIsFormOpen(false); setEditingCredit(null); }}
          onSubmit={handleSubmit}
          initialData={editingCredit ? {
            issueDate: editingCredit.issueDate || editingCredit.dueDate,
            description: editingCredit.description,
            originalValue: editingCredit.originalValue,
            bankAccount: editingCredit.bankAccount,
          } : undefined}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deletingCredit && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="px-8 py-6 bg-red-50 border-b border-red-100">
                <h3 className="font-black text-lg text-red-700 uppercase tracking-tight">Confirmar Exclusão</h3>
              </div>
              <div className="px-8 py-6 space-y-4">
                <p className="text-slate-700 text-sm">
                  Tem certeza que deseja excluir o crédito <strong className="text-slate-900">"{deletingCredit.description}"</strong> no valor de{' '}
                  <strong className="text-red-600">{currency(deletingCredit.originalValue || 0)}</strong>?
                </p>
                <p className="text-xs text-slate-500">Esta ação não pode ser desfeita.</p>
              </div>
              <div className="flex gap-3 px-8 py-5 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={() => setDeletingCredit(null)}
                  className="flex-1 py-3 px-4 text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-100 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteCreditMutation.isPending}
                  className="flex-1 py-3 px-4 text-white bg-red-600 hover:bg-red-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {deleteCreditMutation.isPending ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default CreditsTab;
