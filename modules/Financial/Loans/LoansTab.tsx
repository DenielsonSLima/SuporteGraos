
import React, { useState, useMemo } from 'react';
import { Plus, Search, History, Landmark, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { LoanRecord } from '../types';
import LoanKPIs from './components/LoanKPIs';
import LoanList from './components/LoanList';
import LoanDetails from './components/LoanDetails';
import LoanFormModal from './components/LoanFormModal';
import LoanListPdfModal from './components/LoanListPdfModal';
import type { Loan } from '../../../services/loansService';
import { useLoans, useCreateLoan } from '../../../hooks/useLoans';
import { useToast } from '../../../contexts/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../hooks/queryKeys';

type TabType = 'all' | 'taken' | 'granted' | 'history';

// Adaptador: Loan (DB) → LoanRecord (UI)
function toLoanRecord(loan: Loan): LoanRecord {
  return {
    id: loan.id,
    entityName: loan.lender_id || 'Empréstimo',
    contractDate: loan.start_date,
    originalValue: loan.principal_amount,
    totalValue: loan.principal_amount,
    interestRate: loan.interest_rate ?? 0,
    installments: 1,
    remainingValue: loan.remaining_amount,
    nextDueDate: loan.end_date || loan.start_date,
    status: loan.status === 'paid' ? 'settled' : loan.status === 'cancelled' ? 'settled' : 'active',
    type: loan.type,
    transactions: [],
    accountId: (loan as any).account_id,
  };
}

const LoansTab: React.FC = () => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [selectedLoanSnapshot, setSelectedLoanSnapshot] = useState<LoanRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<TabType>('all');

  // TanStack Query: dados + realtime automático
  const { data: rawLoans = [] } = useLoans();
  const createLoanMutation = useCreateLoan();
  const loans = useMemo(() => rawLoans.map(toLoanRecord), [rawLoans]);

  const selectedLoan = useMemo(() =>
    loans.find(l => l.id === selectedLoanId) || selectedLoanSnapshot,
    [loans, selectedLoanId, selectedLoanSnapshot]);

  const filteredLoans = useMemo(() => {
    return loans.filter(l => {
      const matchesSearch = l.entityName.toLowerCase().includes(searchTerm.toLowerCase());
      if (activeSubTab === 'history') return matchesSearch;
      const isActive = l.status === 'active';
      if (!isActive) return false;
      if (activeSubTab === 'taken') return matchesSearch && l.type === 'taken';
      if (activeSubTab === 'granted') return matchesSearch && l.type === 'granted';
      return matchesSearch;
    }).sort((a, b) => new Date(b.contractDate).getTime() - new Date(a.contractDate).getTime());
  }, [loans, searchTerm, activeSubTab]);

  const handleCreateLoan = async (data: any) => {
    createLoanMutation.mutate(
      {
        lenderId: data.lenderId || undefined,
        principalAmount: data.contractValue || data.value,
        interestRate: data.interestRate || 0,
        startDate: data.date,
        endDate: data.endDate || undefined,
        numInstallments: data.installments || 1,
        description: data.description,
        accountId: data.accountId,
        accountName: data.accountName,
        type: data.type
      },
      {
        onSuccess: () => {
          setIsFormOpen(false);
          addToast('success', 'Empréstimo Registrado com Sucesso!');
        },
        onError: (err: any) => {
          addToast('error', 'Erro ao criar empréstimo', err.message);
        },
      }
    );
  };

  if (selectedLoanId && selectedLoan) {
    return (
      <LoanDetails
        loan={selectedLoan}
        onBack={() => {
          setSelectedLoanId(null);
          setSelectedLoanSnapshot(null);
        }}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOANS })}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      <LoanKPIs />

      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full xl:w-auto shadow-inner">
          <button onClick={() => setActiveSubTab('all')} className={`flex-1 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${activeSubTab === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}>
            <Landmark size={14} /> Ativos
          </button>
          <button onClick={() => setActiveSubTab('taken')} className={`flex-1 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${activeSubTab === 'taken' ? 'bg-white shadow text-rose-600' : 'text-slate-400'}`}>
            <ArrowDownLeft size={14} /> Tomados
          </button>
          <button onClick={() => setActiveSubTab('granted')} className={`flex-1 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${activeSubTab === 'granted' ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}>
            <ArrowUpRight size={14} /> Concedidos
          </button>
          <div className="w-px h-4 bg-slate-300 mx-1 self-center"></div>
          <button onClick={() => setActiveSubTab('history')} className={`flex-1 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${activeSubTab === 'history' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400'}`}>
            <History size={14} /> Histórico
          </button>
        </div>

        <div className="flex-1 w-full max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Pesquisar contrato..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-slate-800 outline-none font-bold text-sm text-slate-900"
          />
        </div>

        <div className="flex gap-2 w-full xl:w-auto">
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="flex-1 xl:flex-none bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all active:scale-95"
          >
            Exportar
          </button>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex-1 xl:flex-none bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Novo Contrato
          </button>
        </div>
      </div>

      <LoanList
        loans={filteredLoans}
        onSelect={(id) => {
          setSelectedLoanId(id);
          const found = loans.find(l => l.id === id) || filteredLoans.find(l => l.id === id) || null;
          setSelectedLoanSnapshot(found);
        }}
      />

      <LoanFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleCreateLoan}
        initialType={activeSubTab === 'taken' || activeSubTab === 'granted' ? activeSubTab : 'taken'}
      />

      <LoanListPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        loans={filteredLoans}
        tab={activeSubTab}
      />
    </div>
  );
};

export default LoansTab;
