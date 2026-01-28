
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, History, Landmark, ArrowUpRight, ArrowDownLeft, Filter } from 'lucide-react';
import { LoanRecord } from '../types';
import LoanKPIs from './components/LoanKPIs';
import LoanList from './components/LoanList';
import LoanDetails from './components/LoanDetails';
import LoanFormModal from './components/LoanFormModal';
import LoanListPdfModal from './components/LoanListPdfModal';
import { loansService } from '../../../services/financial/loansService';
import { useToast } from '../../../contexts/ToastContext';

type TabType = 'all' | 'taken' | 'granted' | 'history';

const LoansTab: React.FC = () => {
  const { addToast } = useToast();
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<TabType>('all');

  const loadData = async () => {
    const data = await loansService.loadFromSupabase();
    setLoans(data);
  };

  useEffect(() => {
    loadData();
    
    // Subscribe to real-time updates
    const unsubscribe = loansService.subscribe((updatedRecords) => {
      setLoans(updatedRecords);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const selectedLoan = useMemo(() => 
    loans.find(l => l.id === selectedLoanId),
  [loans, selectedLoanId]);

  const filteredLoans = useMemo(() => {
    return loans.filter(l => {
      const matchesSearch = l.entityName.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Lógica de Abas
      if (activeSubTab === 'history') return matchesSearch; // Mostra tudo no histórico
      
      const isActive = l.status === 'active';
      if (!isActive) return false; // Nas outras abas, só mostra ativos

      if (activeSubTab === 'taken') return matchesSearch && l.type === 'taken';
      if (activeSubTab === 'granted') return matchesSearch && l.type === 'granted';
      
      return matchesSearch; // Aba 'all' (ativos)
    }).sort((a, b) => new Date(b.contractDate).getTime() - new Date(a.contractDate).getTime());
  }, [loans, searchTerm, activeSubTab]);

  if (selectedLoanId && selectedLoan) {
    return (
      <LoanDetails 
        loan={selectedLoan} 
        onBack={() => setSelectedLoanId(null)} 
        onUpdate={loadData}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <LoanKPIs loans={loans} />

      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full xl:w-auto shadow-inner">
          <button onClick={() => setActiveSubTab('all')} className={`flex-1 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${activeSubTab === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}>
            <Landmark size={14}/> Ativos
          </button>
          <button onClick={() => setActiveSubTab('taken')} className={`flex-1 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${activeSubTab === 'taken' ? 'bg-white shadow text-rose-600' : 'text-slate-400'}`}>
            <ArrowDownLeft size={14}/> Tomados
          </button>
          <button onClick={() => setActiveSubTab('granted')} className={`flex-1 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${activeSubTab === 'granted' ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}>
            <ArrowUpRight size={14}/> Concedidos
          </button>
          <div className="w-px h-4 bg-slate-300 mx-1 self-center"></div>
          <button onClick={() => setActiveSubTab('history')} className={`flex-1 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${activeSubTab === 'history' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400'}`}>
            <History size={14}/> Histórico
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

      <LoanList loans={filteredLoans} onSelect={setSelectedLoanId} />

      <LoanFormModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSave={(data) => {
          loanService.add({ ...data, id: Math.random().toString(36).substr(2, 9), status: 'active', remainingValue: data.totalValue });
          loadData();
          addToast('success', 'Contrato Registrado');
        }} 
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
