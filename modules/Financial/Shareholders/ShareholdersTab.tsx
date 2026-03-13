
import React, { useState, useMemo } from 'react';
import { PlusCircle, Wallet, Users, Landmark, PiggyBank, ArrowRightLeft, Layers } from 'lucide-react';
import type { Shareholder } from '../../../services/shareholderService';
import { useShareholders, useShareholderTransaction } from '../../../hooks/useShareholders';
import ShareholderCard from './components/ShareholderCard';
import ShareholderDetails from './components/ShareholderDetails';
import ShareholderPdfModal from './components/ShareholderPdfModal';
import ShareholderCreditModal from './components/ShareholderCreditModal';
import ShareholderRecurringModal from './components/ShareholderRecurringModal';
import ShareholderBulkCreditModal from './components/ShareholderBulkCreditModal';
import FinancialPaymentModal, { PaymentData } from '../components/modals/FinancialPaymentModal';
import { useToast } from '../../../contexts/ToastContext';

const ShareholdersTab: React.FC = () => {
  const { addToast } = useToast();
  const { data: shareholders = [] } = useShareholders();
  const addTransaction = useShareholderTransaction();

  // Navigation State
  const [viewMode, setViewMode] = useState<'list' | 'details'>('list');
  const [selectedShareholder, setSelectedShareholder] = useState<Shareholder | null>(null);

  // Modals State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);

  const refreshData = () => {
    // Hook mutations auto-invalidate queries on success
    if (selectedShareholder) {
      const updated = shareholders.find(s => s.id === selectedShareholder.id);
      if (updated) setSelectedShareholder(updated);
    }
  };

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  // --- ACTIONS ---

  // 1. Withdraw (Debit/Pagamento)
  const openWithdrawModal = (s: Shareholder) => {
    setSelectedShareholder(s);
    setIsWithdrawModalOpen(true);
  };

  const handleConfirmWithdraw = async (data: PaymentData) => {
    if (!selectedShareholder) return;

    try {
      await addTransaction.mutateAsync({
        shareholderId: selectedShareholder.id,
        transaction: {
          date: data.date,
          type: 'debit',
          value: data.amount,
          description: data.notes || 'Pagamento / Retirada de Saldo',
          accountId: data.accountId
        }
      });

      setIsWithdrawModalOpen(false);
      refreshData();
      addToast('success', 'Pagamento Registrado');
    } catch (err: any) {
      console.error('[ShareholdersTab] Erro ao registrar pagamento:', err);
      addToast('error', 'Erro ao Registrar Pagamento', err?.message || 'Tente novamente.');
    }
  };

  // 2. Credit (Add Credit - Pro Labore/Profit)
  const openCreditModal = (s?: Shareholder) => {
    if (s) {
      setSelectedShareholder(s);
    } else {
      setSelectedShareholder(null);
    }
    setIsCreditModalOpen(true);
  };

  const handleConfirmCredit = async (data: { shareholderId: string; date: string; value: number; description: string; payImmediately?: boolean; accountId?: string; accountName?: string }) => {
    try {
      await addTransaction.mutateAsync({
        shareholderId: data.shareholderId,
        transaction: {
          date: data.date,
          type: 'credit',
          value: data.value,
          description: data.description,
          accountId: data.payImmediately && data.accountId ? data.accountId : undefined
        }
      });

      setIsCreditModalOpen(false);
      refreshData();
      addToast('success', 'Crédito Lançado', data.payImmediately ? 'Valor lançado e baixado do caixa.' : 'Saldo pendente atualizado.');
    } catch (err: any) {
      console.error('[ShareholdersTab] Erro ao lançar crédito:', err);
      addToast('error', 'Erro ao Lançar Crédito', err?.message || 'Tente novamente.');
    }
  };

  // 3. Recurrence
  const openRecurringModal = (s: Shareholder) => {
    setSelectedShareholder(s);
    setIsRecurringModalOpen(true);
  };

  const handleConfirmRecurring = (_config: { active: boolean; amount: number; day: number }) => {
    if (!selectedShareholder) return;
    addToast('info', 'Recorrência será implementada na próxima fase');
    setIsRecurringModalOpen(false);
    refreshData();
  };

  // 4. Bulk / Individual Process
  const handleProcessIndividualTransaction = async (type: 'credit' | 'payment', data: { shareholderId: string, date: string, value: number, description: string, accountId?: string, accountName?: string }) => {
    try {
      await addTransaction.mutateAsync({
        shareholderId: data.shareholderId,
        transaction: {
          date: data.date,
          type: type === 'payment' ? 'debit' : 'credit',
          value: data.value,
          description: data.description,
          accountId: type === 'payment' && data.accountId ? data.accountId : undefined
        }
      });

      refreshData();
      addToast('success', type === 'payment' ? 'Pagamento Realizado' : 'Crédito Lançado', `Valor: ${currency(data.value)}`);
    } catch (err: any) {
      console.error('[ShareholdersTab] Erro ao processar transação:', err);
      addToast('error', 'Erro na Transação', err?.message || 'Verifique o console para detalhes.');
      throw err; // Re-throw para que o BulkCreditModal saiba que falhou
    }
  };

  // Navigation Logic
  const handleOpenDetails = (s: Shareholder) => {
    setSelectedShareholder(s);
    setViewMode('details');
  };

  const handleBackToList = () => {
    setSelectedShareholder(null);
    setViewMode('list');
  };

  // --- RENDER DETAILS VIEW ---
  if (viewMode === 'details' && selectedShareholder) {
    return (
      <>
        <ShareholderDetails
          shareholder={selectedShareholder}
          onBack={handleBackToList}
          onGeneratePdf={() => setIsPdfOpen(true)}
          onWithdraw={() => openWithdrawModal(selectedShareholder)}
          onAddCredit={() => openCreditModal(selectedShareholder)}
        />

        <ShareholderPdfModal
          isOpen={isPdfOpen}
          onClose={() => setIsPdfOpen(false)}
          shareholder={selectedShareholder}
        />

        {isWithdrawModalOpen && selectedShareholder && (
          <FinancialPaymentModal
            isOpen={isWithdrawModalOpen}
            onClose={() => setIsWithdrawModalOpen(false)}
            onConfirm={handleConfirmWithdraw}
            record={{
              id: 'withdraw-temp',
              description: `Pagamento ao Sócio - ${selectedShareholder.name}`,
              entityName: selectedShareholder.name,
              category: 'Retirada de Sócios',
              dueDate: new Date().toISOString().split('T')[0],
              issueDate: new Date().toISOString().split('T')[0],
              originalValue: selectedShareholder.financial.currentBalance > 0 ? selectedShareholder.financial.currentBalance : 0,
              paidValue: 0,
              status: 'pending',
              subType: 'shareholder'
            }}
          />
        )}

        {isCreditModalOpen && (
          <ShareholderCreditModal
            isOpen={isCreditModalOpen}
            onClose={() => setIsCreditModalOpen(false)}
            onConfirm={handleConfirmCredit}
            shareholderName={selectedShareholder?.name}
            shareholders={shareholders}
          />
        )}
      </>
    );
  }

  // --- RENDER LIST VIEW ---
  return (
    <div className="space-y-6 animate-in fade-in">

      {/* Top Banner & Actions */}
      <div className="flex flex-col xl:flex-row justify-between items-center bg-white border border-slate-200 p-5 rounded-2xl gap-6 shadow-sm">
        <div className="flex items-center gap-4 w-full xl:w-auto">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 shadow-sm">
            <Wallet size={28} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight italic">Conta Corrente dos Sócios</h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Gestão de saldos acumulados e retiradas</p>
          </div>
        </div>

        <div className="flex gap-3 w-full xl:w-auto">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-colors"
          >
            <Layers size={16} /> Painel de Lançamentos
          </button>
          <button
            onClick={() => openCreditModal()}
            className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-200"
            disabled={shareholders.length === 0}
          >
            <PlusCircle size={16} /> Novo Crédito
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {shareholders.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <Users size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-slate-600 font-bold uppercase tracking-widest">Nenhum sócio cadastrado</h3>
            <p className="text-sm text-slate-400 mt-2">Vá em Configurações &gt; Sócios para adicionar.</p>
          </div>
        ) : (
          shareholders.map(shareholder => (
            <ShareholderCard
              key={shareholder.id}
              shareholder={shareholder}
              onWithdraw={() => openWithdrawModal(shareholder)}
              onViewHistory={handleOpenDetails}
              onConfigureRecurrence={openRecurringModal}
            />
          ))
        )}
      </div>

      {/* MODALS GLOBAIS */}

      {isWithdrawModalOpen && selectedShareholder && (
        <FinancialPaymentModal
          isOpen={isWithdrawModalOpen}
          onClose={() => setIsWithdrawModalOpen(false)}
          onConfirm={handleConfirmWithdraw}
          record={{
            id: 'withdraw-temp',
            description: `Pagamento ao Sócio - ${selectedShareholder.name}`,
            entityName: selectedShareholder.name,
            category: 'Retirada de Sócios',
            dueDate: new Date().toISOString().split('T')[0],
            issueDate: new Date().toISOString().split('T')[0],
            originalValue: selectedShareholder.financial.currentBalance > 0 ? selectedShareholder.financial.currentBalance : 0,
            paidValue: 0,
            status: 'pending',
            subType: 'shareholder'
          }}
        />
      )}

      {isRecurringModalOpen && selectedShareholder && (
        <ShareholderRecurringModal
          isOpen={isRecurringModalOpen}
          onClose={() => setIsRecurringModalOpen(false)}
          onConfirm={handleConfirmRecurring}
          shareholder={selectedShareholder}
        />
      )}

      {isCreditModalOpen && (
        <ShareholderCreditModal
          isOpen={isCreditModalOpen}
          onClose={() => setIsCreditModalOpen(false)}
          onConfirm={handleConfirmCredit}
          shareholderName={selectedShareholder?.name}
          shareholders={shareholders}
        />
      )}

      <ShareholderBulkCreditModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        shareholders={shareholders}
        onProcessTransaction={handleProcessIndividualTransaction}
      />

    </div>
  );
};

export default ShareholdersTab;
