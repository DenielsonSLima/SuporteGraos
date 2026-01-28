
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, CheckCircle, Plus, DollarSign, Truck, PackageCheck, TrendingUp, Clock, Calculator, ShieldCheck, UserCheck } from 'lucide-react';
import { SalesOrder } from '../types';
import { OrderNote } from '../../PurchaseOrder/types';
import SalesFinancialCard from './details/SalesFinancialCard';
import SalesOrderHeader from './details/SalesOrderHeader';
import SalesProductSummary from './details/SalesProductSummary';
import SalesLoadingsTable from './details/SalesLoadingsTable';
import SalesReceiptModal from './modals/SalesReceiptModal';
import NoteModal from '../../PurchaseOrder/components/modals/NoteModal';
import LoadingManagement from '../../Loadings/components/LoadingManagement';
import PdfPreviewModal from '../../PurchaseOrder/components/modals/PdfPreviewModal'; 
import ActionConfirmationModal from '../../../components/ui/ActionConfirmationModal';
import { Loading } from '../../Loadings/types';
import { loadingService } from '../../../services/loadingService';
import { salesService } from '../../../services/salesService';
import { financialActionService } from '../../../services/financialActionService';
import { useToast } from '../../../contexts/ToastContext';
import { ModuleId } from '../../../types';

interface Props {
  order: SalesOrder;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void; 
  onFinalize: () => void;
}

const SalesOrderDetails: React.FC<Props> = ({ order, onBack, onEdit, onDelete, onFinalize }) => {
  const { addToast } = useToast();
  const [currentOrder, setCurrentOrder] = useState<SalesOrder>(order);
  const [loadings, setLoadings] = useState<Loading[]>([]);

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [pdfVariant, setPdfVariant] = useState<'producer' | 'internal'>('producer');
  const [selectedLoading, setSelectedLoading] = useState<Loading | null>(null);
  const [isFinalizePromptOpen, setIsFinalizePromptOpen] = useState(false);

  const refreshData = () => {
    const list = loadingService.getBySalesOrder(order.id);
    setLoadings([...list]);
    const fresh = salesService.getById(order.id);
    if (fresh) setCurrentOrder(fresh);
  };

  useEffect(() => { refreshData(); }, [order.id]);

  const stats = useMemo(() => {
    const active = loadings.filter(l => l.status !== 'canceled');
    const totalDeliveredVal = active.filter(l => (l.unloadWeightKg || 0) > 0).reduce((acc, l) => acc + (l.totalSalesValue || 0), 0);
    const totalTransitVal = active.filter(l => !(l.unloadWeightKg || 0)).reduce((acc, l) => acc + (l.weightSc * (l.salesPrice || order.unitPrice || 0)), 0);
    const totalReceived = (currentOrder.transactions || []).reduce((acc, t) => acc + t.value + (t.discountValue || 0), 0);
    return { totalDeliveredVal, totalTransitVal, totalReceived, balance: Math.max(0, totalDeliveredVal - totalReceived) };
  }, [loadings, currentOrder]);

  const handleConfirmReceipt = (data: any) => {
    financialActionService.processRecord(`so-${currentOrder.id}`, data, 'sales_order');
    refreshData();
    setIsPayModalOpen(false);
    addToast('success', 'Recebimento Registrado');
    if (stats.balance <= data.amount + 1) setIsFinalizePromptOpen(true);
  };

  return (
    <div className="animate-in slide-in-from-right-4 duration-300 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all shadow-sm">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Venda {currentOrder.number}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Status: {currentOrder.status}</p>
          </div>
        </div>
        <div className="flex gap-2">
            <button onClick={() => { setPdfVariant('producer'); setIsPdfOpen(true); }} className="px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-[10px] font-black uppercase text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"><UserCheck size={16}/> PDF Cliente</button>
            <button onClick={() => { setPdfVariant('internal'); setIsPdfOpen(true); }} className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2"><ShieldCheck size={16}/> Auditoria</button>
            <div className="w-px h-10 bg-slate-200 mx-2"></div>
            <button onClick={onEdit} className="px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black uppercase text-slate-700 hover:bg-slate-50">Editar</button>
            <button onClick={onDelete} className="px-4 py-2.5 bg-white border border-rose-200 rounded-xl text-xs font-black uppercase text-rose-600 hover:bg-rose-50">Excluir</button>
        </div>
      </div>

      <SalesOrderHeader order={currentOrder} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Mercadoria em Trânsito</span>
            <p className="text-xl font-black text-blue-600 italic">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalTransitVal)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[9px] font-black text-emerald-600 uppercase block mb-1">Faturado Realizado</span>
            <p className="text-xl font-black text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalDeliveredVal)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[9px] font-black text-emerald-600 uppercase block mb-1">Total Recebido</span>
            <p className="text-xl font-black text-emerald-700 italic">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalReceived)}</p>
          </div>
          <div className={`p-5 rounded-2xl border-2 shadow-lg ${stats.balance > 0.1 ? 'bg-amber-50 border-amber-300' : 'bg-emerald-600 border-emerald-500 text-white'}`}>
            <span className={`text-[9px] font-black uppercase block mb-1 ${stats.balance > 0.1 ? 'text-amber-700' : 'text-emerald-100'}`}>Saldo a Receber</span>
            <p className="text-xl font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.balance)}</p>
          </div>
      </div>

      <SalesProductSummary order={currentOrder} loadings={loadings} />
      <SalesLoadingsTable loadings={loadings} onNavigateToPurchase={(id) => window.dispatchEvent(new CustomEvent('app:navigate', { detail: { moduleId: ModuleId.PURCHASE_ORDER, orderId: id } }))} onViewLoading={setSelectedLoading} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <SalesFinancialCard orderId={currentOrder.id} transactions={currentOrder.transactions || []} totalOrderValue={stats.totalDeliveredVal} onAddReceipt={() => setIsPayModalOpen(true)} onRefresh={refreshData} />
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2">Anotações da Venda</h3>
            <button onClick={() => setIsNoteModalOpen(true)} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:border-blue-300 hover:text-blue-600 transition-all">+ Nova Observação</button>
            <div className="mt-4 space-y-3">
                {currentOrder.notesList?.map(n => (
                    <div key={n.id} className="p-3 bg-slate-50 rounded-xl text-xs">
                        <p className="font-bold text-slate-400 text-[9px] uppercase mb-1">{new Date(n.date).toLocaleDateString()} - {n.author}</p>
                        <p className="font-medium text-slate-700 italic">"{n.text}"</p>
                    </div>
                ))}
            </div>
        </div>
      </div>

      <SalesReceiptModal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} onConfirm={handleConfirmReceipt} totalPending={stats.balance} recordDescription={`Cliente ${currentOrder.customerName}`} />
      <NoteModal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} onSave={(n) => { const note = { ...n, id: Math.random().toString(36).substr(2,9) }; salesService.update({ ...currentOrder, notesList: [note, ...(currentOrder.notesList || [])] }); refreshData(); }} consultantName={currentOrder.consultantName} />
      <PdfPreviewModal isOpen={isPdfOpen} onClose={() => setIsPdfOpen(false)} order={currentOrder} variant={pdfVariant} />
      {selectedLoading && <LoadingManagement loading={selectedLoading} onClose={() => setSelectedLoading(null)} onUpdate={refreshData} originContext="sales" />}
      <ActionConfirmationModal isOpen={isFinalizePromptOpen} onClose={() => setIsFinalizePromptOpen(false)} onConfirm={() => { onFinalize(); refreshData(); setIsFinalizePromptOpen(false); }} title="Saldo Quitado!" description="Deseja marcar esta venda como finalizada?" type="success" confirmLabel="Finalizar" />
    </div>
  );
};

export default SalesOrderDetails;
