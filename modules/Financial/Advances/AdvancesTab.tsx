
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
  AlertTriangle,
  Edit3,
  Trash2
} from 'lucide-react';
import { useAdvances } from '../../../hooks/useAdvances';
import { usePartners } from '../../../hooks/useParceiros';
import type { Advance } from '../../../services/advancesService';
import { Partner } from '../../Partners/types';
import { AdvanceTransaction } from './types';
import AdvanceForm from './components/AdvanceForm';
import AdvanceListPdfModal from './components/AdvanceListPdfModal';
import SettleAdvanceModal from './components/SettleAdvanceModal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import { useToast } from '../../../contexts/ToastContext';
import { useAdvancesOperations } from './hooks/useAdvancesOperations';
import AdvanceTracebackView from './components/AdvanceTracebackView';

import AdvanceKPIs from './components/AdvanceKPIs';

type AdvanceSubTab = 'active' | 'taken' | 'given' | 'history' | 'traceback';

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
    settledAmount: adv.settled_amount,
    remainingAmount: adv.remaining_amount,
    description: adv.description || '',
    status: adv.status === 'open' || adv.status === 'partially_settled' ? 'active' : 'settled',
    accountId: adv.account_id || undefined,
    accountName: adv.account_name || undefined,
  };
}

const AdvancesTab: React.FC = () => {
  const { addToast } = useToast();
  const { data: advances = [] } = useAdvances();
  const partnersParams = useMemo(() => ({ page: 1, pageSize: 2000 }), []);
  const { data: partnersResult } = usePartners(partnersParams);
  const partners: Partner[] = partnersResult?.data || [];
  const { handleSaveAdvance, handleConfirmSettle, handleUpdateAdvance, handleDeleteAdvance } = useAdvancesOperations({ addToast });

  const [activeSubTab, setActiveSubTab] = useState<AdvanceSubTab>('active');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [txToSettle, setTxToSettle] = useState<AdvanceTransaction | null>(null);
  const [txToEdit, setTxToEdit] = useState<AdvanceTransaction | null>(null);

  // Confirm modal states
  const [deleteTarget, setDeleteTarget] = useState<AdvanceTransaction | null>(null);
  const [deleteChildId, setDeleteChildId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (tx: AdvanceTransaction) => {
    if (tx.settledAmount && tx.settledAmount > 0) {
      addToast('error', 'Não é possível excluir', `Este adiantamento já possui ${currency(tx.settledAmount)} consumidos. Estorne as baixas primeiro.`);
      return;
    }
    setDeleteTarget(tx);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await handleDeleteAdvance(deleteTarget.id);
      addToast('success', 'Excluído com sucesso', `Adiantamento de ${currency(deleteTarget.value)} para ${deleteTarget.partnerName} foi excluído e o valor estornado.`);
    } catch {
      addToast('error', 'Erro ao excluir', 'Não foi possível excluir o adiantamento. Tente novamente.');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const [txForDetails, setTxForDetails] = useState<AdvanceTransaction | null>(null);

  const handleOpenDetails = (tx: AdvanceTransaction) => {
    setTxForDetails(tx);
    setActiveSubTab('traceback');
  };

  const handleDeleteChild = (childId: string) => {
    setDeleteChildId(childId);
  };

  const handleConfirmDeleteChild = async () => {
    if (!deleteChildId) return;
    setIsDeleting(true);
    try {
      await handleDeleteAdvance(deleteChildId);
      addToast('success', 'Baixa estornada', 'O valor foi devolvido ao saldo do adiantamento principal.');
    } catch {
      addToast('error', 'Erro ao estornar', 'Não foi possível estornar a baixa. Tente novamente.');
    } finally {
      setIsDeleting(false);
      setDeleteChildId(null);
    }
  };

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
    return transactions.filter(t => {
      const matchesSearch = t.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase());
        
      if (activeSubTab === 'history') {
        const matchesStart = !historyStartDate || t.date >= historyStartDate;
        const matchesEnd = !historyEndDate || t.date <= historyEndDate;
        return matchesSearch && matchesStart && matchesEnd;
      }

      if (!matchesSearch) return false;

      if (activeSubTab === 'active') return t.status === 'active';
      return t.type === activeSubTab && t.status === 'active';
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, activeSubTab, searchTerm, historyStartDate, historyEndDate]);

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

  if (activeSubTab === 'traceback' && txForDetails) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <AdvanceTracebackView
          advance={txForDetails}
          allAdvances={transactions}
          onBack={() => {
            setActiveSubTab('taken');
            setTxForDetails(null);
          }}
          onEdit={(tx) => {
            setTxToEdit(tx);
          }}
          onDelete={async (tx) => {
            await handleDeleteClick(tx);
            setActiveSubTab('taken');
            setTxForDetails(null);
          }}
          onDeleteChild={handleDeleteChild}
        />

        <AdvanceForm
          isOpen={!!txToEdit}
          onClose={() => {
            setTxToEdit(null);
          }}
          onSave={async (data) => {
            if (txToEdit) {
              await handleUpdateAdvance(txToEdit.id, data);
            }
          }}
          initialData={txToEdit || undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      <AdvanceKPIs searchTerm={searchTerm} activeSubTab={activeSubTab} />

      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full xl:w-auto shadow-inner">
          <button onClick={() => setActiveSubTab('active')} className={`flex-1 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${activeSubTab === 'active' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}>
            <Wallet size={14} /> Ativos
          </button>
          <button onClick={() => setActiveSubTab('taken')} className={`flex-1 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${activeSubTab === 'taken' ? 'bg-white shadow text-amber-600' : 'text-slate-400'}`}>
            <ArrowDownLeft size={14} /> Dinheiro Entrando
          </button>
          <button onClick={() => setActiveSubTab('given')} className={`flex-1 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${activeSubTab === 'given' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>
            <ArrowUpRight size={14} /> Dinheiro Saindo
          </button>
          <div className="w-px h-4 bg-slate-300 mx-1 self-center"></div>
          <button onClick={() => setActiveSubTab('history')} className={`flex-1 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${activeSubTab === 'history' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400'}`}>
            <History size={14} /> Histórico Geral
          </button>
        </div>

        <div className="flex-1 w-full max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Pesquisar parceiro ou descrição..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-slate-800 outline-none font-bold text-sm text-slate-900"
          />
        </div>

        <div className="flex gap-2 w-full xl:w-auto">
          <button
            onClick={() => setIsPdfModalOpen(true)}
            disabled={filteredData.length === 0}
            className="flex-1 xl:flex-none bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Printer size={18} /> Exportar PDF
          </button>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex-1 xl:flex-none bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Novo Registro
          </button>
        </div>
      </div>

      {activeSubTab === 'history' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-7 gap-4 animate-in slide-in-from-top-2">
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
              onClick={() => { setSearchTerm(''); setHistoryStartDate(''); setHistoryEndDate(''); }}
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
              onClick={() => handleOpenDetails(tx)}
              className="cursor-pointer group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between h-full relative overflow-hidden hover:border-slate-300"
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
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar size={12} /> Data: {dateStr(tx.date)}
                  </p>
                  {tx.accountName && (
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                      Conta: {tx.accountName}
                    </p>
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Descrição do Lançamento</p>
                  <p className="text-xs font-bold text-slate-600 line-clamp-2">{tx.description}</p>
                </div>

                {tx.settledAmount && tx.settledAmount > 0 ? (
                  <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 mb-6 space-y-1.5 animate-in slide-in-from-top-2">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>VALOR ORIGINAL:</span>
                      <span className="font-black text-slate-700">{currency(tx.value)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-amber-700">
                      <span>CONSUMIDO (BAIXADO):</span>
                      <span className="font-black">- {currency(tx.settledAmount)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black text-emerald-700 pt-1.5 border-t border-dashed border-amber-200">
                      <span>SALDO DISPONÍVEL:</span>
                      <span className="text-sm font-black">{currency(tx.remainingAmount ?? 0)}</span>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="pt-5 border-t border-slate-100 flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                    {tx.settledAmount && tx.settledAmount > 0 ? 'Saldo Restante' : (tx.type === 'given' ? 'Valor que eu Paguei' : 'Valor que eu Recebi')}
                  </p>
                  <p className={`text-2xl font-black tracking-tighter ${tx.settledAmount && tx.settledAmount > 0 ? 'text-emerald-600' : (tx.type === 'taken' ? 'text-amber-600' : 'text-indigo-600')}`}>
                    {currency(tx.settledAmount && tx.settledAmount > 0 ? (tx.remainingAmount ?? 0) : tx.value)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {tx.status === 'active' && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setTxToEdit(tx); }}
                        className="p-3 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        title="Editar Adiantamento"
                      >
                        <Edit3 size={20} />
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(tx); }}
                        className={`p-3 rounded-xl transition-all shadow-sm ${
                          tx.settledAmount && tx.settledAmount > 0
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                            : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white'
                        }`}
                        disabled={!!(tx.settledAmount && tx.settledAmount > 0)}
                        title={
                          tx.settledAmount && tx.settledAmount > 0
                            ? 'Não é possível excluir adiantamentos consumidos'
                            : 'Excluir Adiantamento'
                        }
                      >
                        <Trash2 size={20} />
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenSettle(tx); }}
                        className="p-3 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        title="Realizar Baixa"
                      >
                        <DollarSign size={20} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdvanceForm
        isOpen={isFormOpen || !!txToEdit}
        onClose={() => {
          setIsFormOpen(false);
          setTxToEdit(null);
        }}
        onSave={(data) => {
          if (txToEdit) {
            handleUpdateAdvance(txToEdit.id, data);
          } else {
            handleSaveAdvance(data);
          }
        }}
        initialData={txToEdit || undefined}
      />

      {txToSettle && (
        <SettleAdvanceModal
          isOpen={isSettleModalOpen}
          onClose={() => setIsSettleModalOpen(false)}
          onSave={onConfirmSettle}
          advance={txToSettle}
        />
      )}

      <AdvanceListPdfModal
        // FIX: corrected variable names from isPdfOpen/setIsPdfOpen to isPdfModalOpen/setIsPdfModalOpen
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        transactions={filteredData}
        tab={activeSubTab === 'traceback' ? 'taken' : activeSubTab}
      />

      {/* Confirm Delete Advance Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Adiantamento"
        message={deleteTarget
          ? `Deseja realmente excluir o adiantamento de ${currency(deleteTarget.value)} para ${deleteTarget.partnerName}?`
          : ''
        }
        detail="Esta ação irá estornar a transação financeira correspondente no caixa. Essa operação não poderá ser desfeita."
        confirmLabel="Sim, Excluir"
        cancelLabel="Não, Manter"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Confirm Delete Child Settlement Modal */}
      <ConfirmModal
        isOpen={!!deleteChildId}
        onClose={() => setDeleteChildId(null)}
        onConfirm={handleConfirmDeleteChild}
        title="Estornar Baixa"
        message="Deseja realmente estornar este desconto/baixa do adiantamento?"
        detail="O valor retornará para o saldo do adiantamento principal e a transação bancária correspondente será estornada."
        confirmLabel="Sim, Estornar"
        cancelLabel="Não, Manter"
        variant="warning"
        isLoading={isDeleting}
      />

    </div>
  );
};

export default AdvancesTab;
