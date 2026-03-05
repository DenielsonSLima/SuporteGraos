
import React, { useState, useMemo } from 'react';
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Search,
  History,
  Calendar,
  X,
  Printer,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { useAdvances } from '../../../hooks/useAdvances';
import { usePartners } from '../../../hooks/useParceiros';
import type { Advance } from '../../../services/advancesService';
import { Partner } from '../../Partners/types';
import { AdvanceTransaction } from './types';
import AdvanceForm from './components/AdvanceForm';
import AdvanceListPdfModal from './components/AdvanceListPdfModal';
import TransactionModal from '../../PurchaseOrder/components/modals/TransactionModal';
import { useToast } from '../../../contexts/ToastContext';
import { useAdvancesOperations } from './hooks/useAdvancesOperations';

type AdvanceSubTab = 'taken' | 'given' | 'history';

// Adapter: Advance (DB) → AdvanceTransaction (UI)
function toAdvanceTransaction(adv: Advance, partners: Partner[]): AdvanceTransaction {
  const partner = partners.find((p: any) => p.id === adv.recipient_id);

  return {
    id: adv.id,
    partnerId: adv.recipient_id,
    partnerName: partner?.name || 'Parceiro Desconhecido',
    type: adv.recipient_type === 'client' ? 'taken' : 'given',
    date: adv.advance_date,
    value: adv.amount,
    description: adv.description || '',
    status: adv.status === 'open' || adv.status === 'partially_settled' ? 'active' : 'settled',
  };
}

const AdvancesTab: React.FC = () => {
  const { addToast } = useToast();
  const { data: advances = [] } = useAdvances();
  const { data: partnersResult } = usePartners({ page: 1, pageSize: 2000 });
  const partners: Partner[] = partnersResult?.data || [];
  const { handleSaveAdvance, handleConfirmSettle } = useAdvancesOperations({ addToast });

  const [activeSubTab, setActiveSubTab] = useState<AdvanceSubTab>('taken');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const [historySearch, setHistorySearch] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [txToSettle, setTxToSettle] = useState<AdvanceTransaction | null>(null);

  // Convert DB advances to UI format
  const transactions = useMemo(() => advances.map((adv) => toAdvanceTransaction(adv, partners)), [advances, partners]);

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  const dateStr = (val: string) => {
    if (!val) return '-';
    if (val.includes('T')) return new Date(val).toLocaleDateString('pt-BR');
    const [year, month, day] = val.split('-');
    return `${day}/${month}/${year}`;
  };

  const filteredData = useMemo(() => {
    if (activeSubTab === 'history') {
      return transactions.filter(t => {
        const matchesSearch = t.partnerName.toLowerCase().includes(historySearch.toLowerCase()) ||
          t.description.toLowerCase().includes(historySearch.toLowerCase());
        const matchesStart = !historyStartDate || t.date >= historyStartDate;
        const matchesEnd = !historyEndDate || t.date <= historyEndDate;
        return matchesSearch && matchesStart && matchesEnd;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return transactions.filter(t => t.type === activeSubTab && t.status === 'active')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, activeSubTab, historySearch, historyStartDate, historyEndDate]);

  const handleOpenSettle = (tx: AdvanceTransaction) => {
    setTxToSettle(tx);
    setIsSettleModalOpen(true);
  };

  const onConfirmSettle = async (data: any) => {
    if (!txToSettle) return;
    await handleConfirmSettle(data, txToSettle);
    setIsSettleModalOpen(false);
    setTxToSettle(null);
  };

  const fixedInputClass = 'w-full pl-10 pr-4 py-2.5 border-2 border-slate-300 rounded-xl text-sm bg-white text-slate-950 font-bold focus:border-primary-500 focus:ring-0 outline-none transition-all placeholder:text-slate-400';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full xl:w-auto shadow-inner">
          <button
            onClick={() => setActiveSubTab('taken')}
            className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeSubTab === 'taken' ? 'bg-white text-amber-600 shadow-md' : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <ArrowDownLeft size={16} />
            Recebidos Ativos
          </button>
          <button
            onClick={() => setActiveSubTab('given')}
            className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeSubTab === 'given' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <ArrowUpRight size={16} />
            Concedidos Ativos
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeSubTab === 'history' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <History size={16} />
            Histórico Geral
          </button>
        </div>

        <div className="flex gap-3 w-full xl:w-auto">
          <button
            onClick={() => setIsPdfModalOpen(true)}
            disabled={filteredData.length === 0}
            className="flex-1 xl:flex-none flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <Printer size={18} />
            Exportar PDF
          </button>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex-1 xl:flex-none flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all active:scale-95"
          >
            <Plus size={18} />
            Novo Registro
          </button>
        </div>
      </div>

      {activeSubTab === 'history' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 animate-in slide-in-from-top-2">
          <div className="md:col-span-5 relative">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">Pesquisar Parceiro / Descrição</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Nome do cliente, produtor ou motivo..."
                className={fixedInputClass}
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">Data Inicial</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="date"
                value={historyStartDate}
                onChange={e => setHistoryStartDate(e.target.value)}
                className={fixedInputClass.replace('pl-10', 'pl-9')}
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">Data Final</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="date"
                value={historyEndDate}
                onChange={e => setHistoryEndDate(e.target.value)}
                className={fixedInputClass.replace('pl-10', 'pl-9')}
              />
            </div>
          </div>
          <div className="md:col-span-1 flex items-end">
            <button
              onClick={() => { setHistorySearch(''); setHistoryStartDate(''); setHistoryEndDate(''); }}
              className="w-full h-11 flex items-center justify-center bg-slate-100 border-2 border-slate-200 rounded-xl text-slate-500 hover:text-rose-600 hover:border-rose-300 transition-all shadow-sm"
              title="Limpar Filtros"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {filteredData.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
            <Wallet size={40} />
          </div>
          <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Nenhum adiantamento encontrado</h3>
          <p className="text-sm text-slate-400 mt-2 italic">Tente mudar os filtros ou cadastre um novo registro.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredData.map((tx) => (
            <div
              key={tx.id}
              className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between h-full relative overflow-hidden"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl shadow-inner ${tx.type === 'given' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                    <Wallet size={22} />
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter border shadow-sm ${tx.status === 'active' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-300'}`}>
                      {tx.status === 'active' ? 'Ativo' : 'Liquidado'}
                    </span>
                  </div>
                </div>

                <h3 className="font-black text-slate-800 text-lg mb-1 line-clamp-1 uppercase italic tracking-tight">{tx.partnerName}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-1.5">
                  <Calendar size={12} /> Data: {dateStr(tx.date)}
                </p>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Descrição do Lançamento</p>
                  <p className="text-xs font-bold text-slate-600 line-clamp-2">{tx.description}</p>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-100 flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Valor do Adiantamento</p>
                  <p className={`text-2xl font-black tracking-tighter ${tx.type === 'taken' ? 'text-amber-600' : 'text-indigo-600'}`}>
                    {currency(tx.value)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {tx.status === 'active' && (
                    <button
                      onClick={() => handleOpenSettle(tx)}
                      className="p-3 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                      title="Realizar Baixa"
                    >
                      <DollarSign size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdvanceForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveAdvance}
      />

      {txToSettle && (
        <TransactionModal
          isOpen={isSettleModalOpen}
          onClose={() => setIsSettleModalOpen(false)}
          onSave={onConfirmSettle}
          type="receipt"
          title={`Baixar Saldo - ${txToSettle.partnerName}`}
        />
      )}

      <AdvanceListPdfModal
        // FIX: corrected variable names from isPdfOpen/setIsPdfOpen to isPdfModalOpen/setIsPdfModalOpen
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        transactions={filteredData}
        tab={activeSubTab}
      />

    </div>
  );
};

export default AdvancesTab;
