
import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Truck, Scale, DollarSign, AlertTriangle, AlertCircle,
  CheckCircle2, Building2, Pencil, Save, History,
  ArrowRight, Wallet, ShoppingBag, TrendingUp, Calculator,
  ArrowRightLeft, Check, LayoutGrid, Info, MapPin
} from 'lucide-react';
import { Loading } from '../types';
import TransactionModal from '../../PurchaseOrder/components/modals/TransactionModal';
import LoadingFinancialTab from './LoadingFinancialTab';
import ModalPortal from '../../../components/ui/ModalPortal';
import { useToast } from '../../../contexts/ToastContext';
import { useActiveSales } from '../../../hooks/useActiveSales';
import { useCarrierPartners } from '../../../hooks/useCarrierPartners';
import { usePartnerDrivers, usePartnerVehicles } from '../../../hooks/useParceiros';
import { useUpdateLoading, useDeleteLoading, useSaveLoadingTransaction } from '../../../hooks/useLoadingMutations';
import { computeLoadingStats, recalcFreightValue, recalcSalesValue } from '../calculations';

// ─── Componentes Modulados (Seções) ────────────────────────────────────────
import LoadingHeader from './sections/LoadingHeader';
import LoadingStructuralInfo from './sections/LoadingStructuralInfo';
import LoadingWeightConferencing from './sections/LoadingWeightConferencing';
import LoadingFinancialSummary from './sections/LoadingFinancialSummary';

interface Props {
  loading: Loading;
  onClose: () => void;
  onUpdate: (updatedLoading: Loading | null) => void;
  originContext?: 'purchase' | 'sales' | 'logistics';
}

const LoadingManagement: React.FC<Props> = ({ loading, onClose, onUpdate, originContext = 'logistics' }) => {
  const { addToast } = useToast();

  // ─── TanStack Query Hooks ──────────────────────────────────────────────────
  const { data: activeSales = [] } = useActiveSales();
  const { data: allCarriers = [] } = useCarrierPartners();
  const updateLoadingMut = useUpdateLoading();
  const deleteLoadingMut = useDeleteLoading();
  const saveTransactionMut = useSaveLoadingTransaction();

  const [activeTab, setActiveTab] = useState<'info' | 'financial'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [isQuickRedirecting, setIsQuickRedirecting] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<'payment' | 'advance'>('payment');

  const [editForm, setEditForm] = useState<Loading>({ ...loading });
  const [freightBase, setFreightBase] = useState<'origin' | 'destination'>('origin');
  const [quickWeight, setQuickWeight] = useState<string>(loading.unloadWeightKg?.toString() || '');

  // ─── Fleet data hooks ──────────────────────────────────────────────────
  const activeCarrierId = isEditing ? editForm.carrierId : '';
  const { data: rawDrivers = [] } = usePartnerDrivers(activeCarrierId);
  const { data: rawVehicles = [] } = usePartnerVehicles(activeCarrierId);
  const availableDrivers = useMemo(() => rawDrivers.filter(d => d.active !== false), [rawDrivers]);
  const availableVehicles = useMemo(() => rawVehicles.filter(v => v.active !== false), [rawVehicles]);

  useEffect(() => {
    setEditForm({ ...loading });
    setQuickWeight(loading.unloadWeightKg?.toString() || '');

    if (loading.unloadWeightKg && loading.unloadWeightKg > 0 && loading.freightPricePerTon > 0) {
      const expectedDestTotal = (loading.unloadWeightKg / 1000) * loading.freightPricePerTon;
      if (Math.abs(loading.totalFreightValue - expectedDestTotal) < 1.1) {
        setFreightBase('destination');
      } else {
        setFreightBase('origin');
      }
    } else {
      setFreightBase('origin');
    }
  }, [loading.id, loading.unloadWeightKg, loading.freightPricePerTon]);

  const stats = useMemo(() => computeLoadingStats(editForm, freightBase), [editForm, freightBase]);

  const handleToggleFreightBase = (newBase: 'origin' | 'destination') => {
    if (newBase === freightBase) return;
    if (newBase === 'destination' && (!editForm.unloadWeightKg || editForm.unloadWeightKg <= 0)) {
      addToast('warning', 'Ação Bloqueada', 'Informe e confirme o peso de destino primeiro.');
      return;
    }
    const wRef = newBase === 'origin' ? editForm.weightKg : editForm.unloadWeightKg!;
    const newTotalFreight = recalcFreightValue(wRef, editForm.freightPricePerTon, editForm.redirectDisplacementValue);
    const updated = { ...editForm, freightBase: (newBase === 'origin' ? 'Origem' : 'Destino') as Loading['freightBase'], totalFreightValue: newTotalFreight };
    setFreightBase(newBase);
    setEditForm(updated);
    updateLoadingMut.mutate(updated);
    onUpdate(updated);
    addToast('info', 'Financeiro Atualizado', `Cálculo baseado no peso de ${newBase === 'origin' ? 'origem' : 'destino'}.`);
  };

  const handleQuickWeightConfirm = () => {
    const wDest = parseFloat(quickWeight);
    if (isNaN(wDest) || wDest <= 0) return addToast('warning', 'Peso Inválido');
    const wRef = freightBase === 'destination' ? wDest : editForm.weightKg;
    const newTotalFreight = recalcFreightValue(wRef, editForm.freightPricePerTon, editForm.redirectDisplacementValue);
    const updated: Loading = {
      ...editForm,
      unloadWeightKg: wDest,
      breakageKg: Math.max(0, editForm.weightKg - wDest),
      status: 'completed' as const,
      totalSalesValue: recalcSalesValue(wDest, editForm.salesPrice),
      totalFreightValue: newTotalFreight
    };
    setEditForm(updated);
    updateLoadingMut.mutate(updated);
    onUpdate(updated);
    addToast('success', 'Peso Confirmado', 'Dados de logística e financeiro atualizados.');
  };

  const handleSaveStructural = () => {
    const finalData = {
      ...editForm,
      freightBase: (freightBase === 'destination' ? 'Destino' : 'Origem') as Loading['freightBase'],
      totalPurchaseValue: parseFloat(stats.purVal.toFixed(2)),
      totalSalesValue: parseFloat(stats.salVal.toFixed(2)),
      totalFreightValue: parseFloat(stats.frVal.toFixed(2)),
      breakageKg: stats.brk
    };
    updateLoadingMut.mutate(finalData);
    onUpdate(finalData);
    setIsEditing(false);
    addToast('success', 'Carregamento Confirmado', 'Alterações salvas com sucesso.');
  };

  const handleSaveDisplacement = () => {
    const updated = { ...editForm, totalFreightValue: parseFloat(stats.frVal.toFixed(2)) };
    setEditForm(updated);
    updateLoadingMut.mutate(updated);
    onUpdate(updated);
    addToast('success', 'Deslocamento Atualizado', 'Valor somado ao total do frete.');
  };

  const handleConfirmRedirect = () => {
    if (!editForm.salesOrderId) return addToast('error', 'Selecione o novo destino');
    const updated: Loading = { ...editForm, isRedirected: true, originalDestination: loading.customerName, status: 'redirected' };
    setEditForm(updated);
    updateLoadingMut.mutate(updated);
    onUpdate(updated);
    setIsQuickRedirecting(false);
    addToast('success', 'Carga Redirecionada', `Destino alterado para ${updated.customerName}`);
  };

  const handleSaveTransaction = (data: any) => {
    const newTx = { id: Math.random().toString(36).substr(2, 9), type: txType, ...data };
    const updated = {
      ...editForm,
      freightPaid: (editForm.freightPaid || 0) + data.value,
      freightAdvances: txType === 'advance' ? (editForm.freightAdvances || 0) + data.value : (editForm.freightAdvances || 0),
      transactions: [newTx, ...(editForm.transactions || [])]
    };
    setEditForm(updated);
    saveTransactionMut.mutate(updated);
    onUpdate(updated);
    setIsTxModalOpen(false);
  };

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  return (
    <ModalPortal>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 animate-in zoom-in-95 duration-300">

        <LoadingHeader
          loading={loading}
          isEditing={isEditing}
          onEditToggle={setIsEditing}
          onSave={handleSaveStructural}
          onDelete={() => {
            const msg = loading.totalFreightValue && loading.totalFreightValue > 0
              ? `⚠️ Excluir carga?\n\n⚡ O frete (${currency(loading.totalFreightValue)}) será DELETADO do Financeiro!`
              : 'Deseja excluir esta carga?';
            if (window.confirm(msg)) { deleteLoadingMut.mutate(loading.id); onUpdate(null); onClose(); }
          }}
          onClose={onClose}
        />

        {!isEditing && (
          <div className="bg-white border-b border-slate-100 px-4 flex shrink-0 space-x-1">
            <button onClick={() => setActiveTab('info')} className={`py-2.5 px-4 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all ${activeTab === 'info' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              <Info size={14} /> Dados da Carga
            </button>
            <button onClick={() => setActiveTab('financial')} className={`py-2.5 px-4 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all ${activeTab === 'financial' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              <DollarSign size={14} /> Financeiro do Frete
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 space-y-4 scrollbar-hide">
          {(activeTab === 'info' || isEditing) ? (
            <>
              <LoadingStructuralInfo
                editForm={editForm}
                isEditing={isEditing}
                isQuickRedirecting={isQuickRedirecting}
                onSetIsQuickRedirecting={setIsQuickRedirecting}
                onUpdateForm={(data) => setEditForm(prev => ({ ...prev, ...data }))}
                onConfirmRedirect={handleConfirmRedirect}
                onSaveDisplacement={handleSaveDisplacement}
                allCarriers={allCarriers}
                availableDrivers={availableDrivers}
                availableVehicles={availableVehicles}
                activeSales={activeSales}
                currency={currency}
              />

              <LoadingWeightConferencing
                editForm={editForm}
                isEditing={isEditing}
                quickWeight={quickWeight}
                onSetQuickWeight={setQuickWeight}
                onQuickWeightConfirm={handleQuickWeightConfirm}
                onUpdateForm={(data) => setEditForm(prev => ({ ...prev, ...data }))}
                stats={stats}
              />

              <LoadingFinancialSummary
                editForm={editForm}
                isEditing={isEditing}
                freightBase={freightBase}
                stats={stats}
                onToggleFreightBase={handleToggleFreightBase}
                onUpdateForm={(data) => setEditForm(prev => ({ ...prev, ...data }))}
                currency={currency}
              />
            </>
          ) : (
            <div className="animate-in fade-in duration-500">
              <LoadingFinancialTab
                loading={editForm}
                onUpdate={(up) => { setEditForm(up); updateLoadingMut.mutate(up); onUpdate(up); }}
                onAddPayment={() => { setTxType('payment'); setIsTxModalOpen(true); }}
              />
            </div>
          )}
        </div>
      </div>

      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSave={handleSaveTransaction}
        type={txType}
        title={txType === 'advance' ? 'Lançar Adiantamento Frete' : 'Baixar Saldo de Frete'}
      />
    </div>
    </ModalPortal>
  );
};

export default LoadingManagement;
