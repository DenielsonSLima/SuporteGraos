
import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck, UserCheck, X } from 'lucide-react';
import { PurchaseOrder, OrderTransaction } from '../types';

// HOOK PERSONALIZADO
import { usePurchaseOrderLogic } from '../hooks/usePurchaseOrderLogic';

// COMPONENTES MODULARES
import PurchaseOrderHeader from './details/PurchaseOrderHeader';
import PurchaseOperationalKPIs from './details/PurchaseOperationalKPIs';
import PurchaseProfitabilityKPIs from './details/PurchaseProfitabilityKPIs';
import OrderFinancialCard from './details/OrderFinancialCard';
import OrderExpensesCard from './details/Expenses/OrderExpensesCard';
import OrderBrokerCard from './details/OrderBrokerCard';
import OrderObservationsCard from './details/OrderObservationsCard';
import OrderProductCard from './details/OrderProductCard';
import PurchaseLoadingsTable from './details/PurchaseLoadingsTable';

// MODALS
import PurchasePaymentModal from './modals/PurchasePaymentModal';
import PurchaseAdvanceModal from './modals/PurchaseAdvanceModal'; // NOVO IMPORT
import TransactionModal from './modals/TransactionModal';
import TransactionManagementModal from '../../Financial/components/modals/TransactionManagementModal';
import ActionConfirmationModal from '../../../components/ui/ActionConfirmationModal';
import NoteModal from './modals/NoteModal';
import PdfPreviewModal, { PdfVariant } from './modals/PdfPreviewModal';
import ExpenseFormModal from './details/Expenses/ExpenseFormModal';
import LoadingForm from '../../Loadings/components/LoadingForm';
import LoadingManagement from '../../Loadings/components/LoadingManagement';
import { Loading } from '../../Loadings/types';

interface Props {
  order: PurchaseOrder;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onFinalize: () => void;
}

const OrderDetails: React.FC<Props> = ({ order, onBack, onEdit, onDelete, onFinalize }) => {
  // Lógica extraída para o hook
  const {
    currentOrder,
    loadings,
    stats,
    mergedTransactions,
    isFinalizePromptOpen,
    setIsFinalizePromptOpen,
    isProcessing,
    actions
  } = usePurchaseOrderLogic(order, onFinalize);

  // Estados de UI (Modais)
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false); // NOVO STATE
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [pdfVariant, setPdfVariant] = useState<PdfVariant>('producer');
  const [showLoadingForm, setShowLoadingForm] = useState(false);

  // Seleções
  const [selectedTx, setSelectedTx] = useState<OrderTransaction | null>(null);
  const [selectedLoading, setSelectedLoading] = useState<Loading | null>(null);
  const [pendingDeleteTxId, setPendingDeleteTxId] = useState<string | null>(null);
  const [pendingDeleteLoadingId, setPendingDeleteLoadingId] = useState<string | null>(null);

  // Wrappers para fechar modais após ação
  const onPaymentConfirm = (data: any) => {
    actions.handleConfirmTransaction(data);
    setIsPayModalOpen(false);
  };

  const onAdvanceConfirm = (data: any) => {
    actions.handleRegisterAdvance(data);
    setIsAdvanceModalOpen(false);
  };

  const onExpenseSave = (data: any) => {
    actions.handleAddExpense(data);
    setIsExpenseModalOpen(false);
  };

  const onCommissionSave = (data: any) => {
    // Fixed: handleAddCommission now correctly exposed in actions
    actions.handleAddCommission(data);
    setIsBrokerModalOpen(false);
  };

  const onTxUpdate = (tx: OrderTransaction) => {
    actions.handleUpdateTx(tx);
    setSelectedTx(null);
  };

  const onNoteSave = (note: any) => {
    // Fixed: handleSaveNote now correctly exposed in actions
    actions.handleSaveNote(note);
    setIsNoteModalOpen(false);
  };

  const onLoadingSave = (loading: Loading) => {
    try {
      actions.handleSaveNewLoading(loading);
    } finally {
      setShowLoadingForm(false);
    }
  };

  return (
    <div className="animate-in slide-in-from-right-4 duration-300 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="rounded-full bg-white p-2.5 text-slate-500 shadow-md transition-all hover:bg-slate-50 hover:text-slate-800">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Compra {currentOrder.number}</h1>
            <p className="text-xs text-slate-500 font-black uppercase tracking-widest mt-1">Status: {currentOrder.status}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setPdfVariant('producer'); setIsPdfOpen(true); }} className="px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-[10px] font-black uppercase text-blue-700 hover:bg-blue-100 transition-all flex items-center gap-2">
            <UserCheck size={16} /> PDF Produtor
          </button>
          <button onClick={() => { setPdfVariant('internal'); setIsPdfOpen(true); }} className="px-4 py-2.5 rounded-xl border border-slate-900 bg-slate-900 text-[10px] font-black uppercase text-white hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg">
            <ShieldCheck size={16} /> PDF Completo (Gerencial)
          </button>

          <div className="w-px h-10 bg-slate-200 mx-1"></div>

          {currentOrder.status !== 'completed' ? (
            <button disabled={isProcessing} onClick={onFinalize} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-xs font-black uppercase text-white hover:bg-emerald-700 shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">
              {isProcessing && <div className="w-3 h-3 rounded-full border-2 border-white border-t-emerald-600 animate-spin"></div>}
              Finalizar
            </button>
          ) : (
            <button disabled={isProcessing} onClick={actions.handleReopen} className="px-4 py-2.5 rounded-xl border-2 border-amber-500 bg-amber-50 text-xs font-black uppercase text-amber-700 hover:bg-amber-100 transition-all active:scale-95 shadow-sm disabled:opacity-50 flex items-center gap-2">
              {isProcessing && <div className="w-3 h-3 rounded-full border-2 border-amber-500 border-t-amber-100 animate-spin"></div>}
              Reabrir Pedido
            </button>
          )}

          {currentOrder.status !== 'canceled' && currentOrder.status !== 'completed' && (
            <button
              onClick={() => {
                setActionModal({
                  isOpen: true,
                  type: 'danger',
                  title: 'Cancelar Pedido?',
                  description: 'Esta ação irá cancelar o pedido e invalidar todos os lançamentos financeiros vinculados no banco de dados.',
                  onConfirm: () => {
                    actions.handleCancel('Cancelado via Detalhes');
                    setActionModal(prev => ({ ...prev, isOpen: false }));
                  }
                });
              }}
              className="px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-xs font-black uppercase text-red-700 hover:bg-red-100 transition-all flex items-center gap-2"
            >
              <X size={16} /> Cancelar Pedido
            </button>
          )}

          <button onClick={onEdit} className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-black uppercase text-slate-700 hover:bg-slate-50 transition-all">Editar</button>
          <button onClick={onDelete} className="px-4 py-2.5 rounded-xl border border-red-100 bg-white text-xs font-black uppercase text-red-600 hover:bg-red-50 transition-all">Excluir</button>
        </div>
      </div>

      <PurchaseOrderHeader order={currentOrder} />

      <PurchaseOperationalKPIs
        totalLoaded={stats.totalPurchaseVal}
        totalSettled={stats.totalSettled}
        totalPending={stats.balancePartner}
        totalAbatements={stats.totalAbatements}
        advanceBalance={stats.advanceBalance} // PASSA O SALDO DE ADIANTAMENTO
      />

      <PurchaseProfitabilityKPIs
        totalPurchase={stats.totalPurchaseVal}
        totalFreight={stats.totalFreightVal}
        totalSales={stats.totalSalesVal}
        avgSalesPrice={stats.avgSalesPrice}
        transactions={mergedTransactions}
      />

      <OrderProductCard
        productName={currentOrder.items[0]?.productName || 'Grão'}
        totalKg={stats.totalKg}
        totalSc={stats.totalSc}
        avgPurchasePrice={stats.avgPurchasePrice}
        totalPurchaseValue={stats.totalPurchaseVal}
      />

      <div className="mb-10">
        <PurchaseLoadingsTable
          loadings={loadings}
          onViewLoading={setSelectedLoading}
          onAddNew={() => setShowLoadingForm(true)}
          onDeleteLoading={setPendingDeleteLoadingId}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <OrderFinancialCard
          orderId={currentOrder.id}
          transactions={mergedTransactions}
          paidValue={stats.totalSettled}    // REATIVO: Considera pagamentos + adiantamentos + despesas parceiro
          balanceValue={stats.balancePartner} // REATIVO: Calculado a partir dos romaneios v1
          deliveredValue={stats.totalPurchaseVal}
          contractValue={currentOrder.totalValue}
          onAddPayment={() => setIsPayModalOpen(true)}
          onAddAdvance={() => setIsAdvanceModalOpen(true)}
          onRefresh={() => actions.refreshLoadings()}
          onDeleteTx={setPendingDeleteTxId}
        />
        <OrderExpensesCard
          transactions={mergedTransactions}
          onAddExpense={() => setIsExpenseModalOpen(true)}
          onEditTx={setSelectedTx}
          onDeleteTx={setPendingDeleteTxId}
        />
      </div>

      <div className="mb-8">
        <OrderObservationsCard notes={currentOrder.notesList || []} onAddNote={() => setIsNoteModalOpen(true)} />
      </div>

      {currentOrder.hasBroker && (
        <div className="mb-8">
          <OrderBrokerCard
            brokerName={currentOrder.brokerName || 'Não Informado'}
            commissionPerSc={currentOrder.brokerCommissionPerSc || 0}
            totalDue={stats.totalCommissionDue}
            paidValue={currentOrder.brokerPaidValue || 0}
            balanceValue={currentOrder.brokerBalanceValue || 0}
            transactions={mergedTransactions}
            onAddPayment={() => setIsBrokerModalOpen(true)}
            onEditTx={setSelectedTx}
            onDeleteTx={setPendingDeleteTxId}
          />
        </div>
      )}

      {/* --- MODALS --- */}

      <PurchasePaymentModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onConfirm={onPaymentConfirm}
        totalPending={stats.balancePartner}
        recordDescription={`Produtor ${currentOrder.partnerName}`}
      />

      <PurchaseAdvanceModal
        isOpen={isAdvanceModalOpen}
        onClose={() => setIsAdvanceModalOpen(false)}
        onConfirm={onAdvanceConfirm}
        partnerName={currentOrder.partnerName}
      />

      <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSave={onExpenseSave}
      />

      <TransactionModal
        isOpen={isBrokerModalOpen}
        onClose={() => setIsBrokerModalOpen(false)}
        onSave={onCommissionSave}
        type="commission"
        title="Lançar Comissão de Corretagem"
      />

      {selectedTx && (
        <TransactionManagementModal
          isOpen={!!selectedTx}
          onClose={() => setSelectedTx(null)}
          transaction={selectedTx}
          onUpdate={onTxUpdate}
          onDelete={actions.handleDeleteTx}
          title={selectedTx.type === 'expense' ? "Editar Despesa Extra" : (selectedTx.type === 'commission' ? "Editar Comissão" : (selectedTx.type === 'advance' ? "Editar Adiantamento" : "Editar Pagamento"))}
        />
      )}

      <ActionConfirmationModal
        isOpen={!!pendingDeleteTxId}
        onClose={() => setPendingDeleteTxId(null)}
        onConfirm={async () => {
          if (pendingDeleteTxId) {
            await actions.handleDeleteTx(pendingDeleteTxId);
          }
          setPendingDeleteTxId(null);
        }}
        title="Estornar Lançamento?"
        description="O valor sairá do histórico e o saldo voltará a constar como aberto."
        type="danger"
      />

      <ActionConfirmationModal
        isOpen={!!pendingDeleteLoadingId}
        onClose={() => setPendingDeleteLoadingId(null)}
        onConfirm={async () => {
          if (pendingDeleteLoadingId) {
            await actions.handleDeleteLoading(pendingDeleteLoadingId);
          }
          setPendingDeleteLoadingId(null);
        }}
        title="Excluir Romaneio?"
        description="⚠️ AVISO: O frete será DELETADO do Financeiro também! Esta ação é permanente."
        type="danger"
      />

      <ActionConfirmationModal
        isOpen={isFinalizePromptOpen}
        onClose={() => setIsFinalizePromptOpen(false)}
        onConfirm={actions.confirmFinalize}
        title="Saldo Quitado!"
        description="O pagamento zerou o saldo devedor deste pedido. Deseja marcar como FINALIZADO?"
        type="success"
        confirmLabel="Sim, Finalizar Pedido"
        cancelLabel="Manter Aberto"
      />

      <NoteModal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} onSave={onNoteSave} consultantName={currentOrder.consultantName} />
      <PdfPreviewModal isOpen={isPdfOpen} onClose={() => setIsPdfOpen(false)} order={currentOrder} variant={pdfVariant} />
      {showLoadingForm && <LoadingForm purchaseOrder={currentOrder} onSave={onLoadingSave} onClose={() => setShowLoadingForm(false)} />}
      {/* Fixed: onUpdate should wrap refreshLoadings in a lambda to avoid passing unexpected arguments */}
      {selectedLoading && <LoadingManagement loading={selectedLoading} onClose={() => setSelectedLoading(null)} onUpdate={() => actions.refreshLoadings()} originContext="purchase" />}
    </div>
  );
};

export default OrderDetails;
