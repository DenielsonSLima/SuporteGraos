import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SalesOrder } from '../types';
import SalesReceiptsCard from './details/SalesReceiptsCard';
import SalesOrderHeader from './details/SalesOrderHeader';
import SalesProductSummary from './details/SalesProductSummary';
import SalesLoadingsTable from './details/SalesLoadingsTable';
import NoteModal from '../../PurchaseOrder/components/modals/NoteModal';
import LoadingManagement from '../../Loadings/components/LoadingManagement';
import SalesPdfPreviewModal from './modals/SalesPdfPreviewModal';
import ActionConfirmationModal from '../../../components/ui/ActionConfirmationModal';
import { Loading } from '../../Loadings/types';
import { useToast } from '../../../contexts/ToastContext';
import { ModuleId } from '../../../types';
import { useSalesOrders } from '../../../hooks/useSalesOrders';
import { useLoadingsBySalesOrder } from '../../../hooks/useLoadings';
import { useSalesOrderDetailsOperations, useCrossModuleNavigation } from '../hooks/useSalesOrderDetailsOperations';
import { useSalesOrderTransactions } from '../hooks/useSalesOrderTransactions';
import { kpiService } from '../../../services/sales/kpiService';

// Componentes Modulares
import SalesOrderActionButtons from './sections/SalesOrderActionButtons';
import SalesOrderKPIGrid from './sections/SalesOrderKPIGrid';
import SalesOrderNotesSection from './sections/SalesOrderNotesSection';

interface Props {
  order: SalesOrder;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onFinalize: () => void;
  onReopen: () => void;
  onCancel: () => void;
}

const SalesOrderDetails: React.FC<Props> = ({ order, onBack, onEdit, onDelete, onFinalize, onReopen, onCancel }) => {
  const { addToast } = useToast();
  const { refreshData, saveNote } = useSalesOrderDetailsOperations();
  const { navigateTo } = useCrossModuleNavigation();

  // Invalida cache e busca dados atualizados
  const { data: allOrdersResult } = useSalesOrders();
  const allOrders = allOrdersResult?.data ?? [];
  const currentOrder: SalesOrder = allOrders.find(o =>
    o.id === order.id ||
    (o.legacy_id && o.legacy_id === order.id) ||
    o.number === order.id ||
    o.number === order.number
  ) ?? order;

  const { data: loadings = [] } = useLoadingsBySalesOrder(currentOrder.id || order.id);
  const { data: realTransactions = [] } = useSalesOrderTransactions(currentOrder.id);

  // INTELIGÊNCIA CENTRALIZADA
  const stats = useMemo(() => 
    kpiService.calculateOrderStats(currentOrder, loadings, realTransactions),
    [currentOrder, loadings, realTransactions]
  );

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [pdfVariant, setPdfVariant] = useState<'producer' | 'internal'>('producer');
  const [selectedLoading, setSelectedLoading] = useState<Loading | null>(null);
  const [isFinalizePromptOpen, setIsFinalizePromptOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldCheckCompletion, setShouldCheckCompletion] = useState(false);

  // 🔄 REFACTORED: Validar fechamento apenas após um recebimento real
  useEffect(() => {
    if (!shouldCheckCompletion || isFinalizePromptOpen || isProcessing) return;

    // 🛡️ SEGURANÇA: Só pede pra finalizar se o financeiro E o operacional baterem com o contrato.
    // O sistema anterior pedia pra finalizar assim que o 'pendente' zerava, 
    // mas o pendente era calculado sobre o que foi faturado (totalRevenueRealized),
    // o que causava prompts em adiantamentos ou entregas parciais.
    
    const isFinancialComplete = stats.totalReceived >= (stats.totalContractValue - 1.0); // margem para arredondamento
    const isOperationalComplete = stats.totalRevenueRealized >= (stats.totalContractValue - 1.0);
    const isNotFinalized = currentOrder.status !== 'completed';
    
    if (isFinancialComplete && isOperationalComplete && isNotFinalized) {
      setIsFinalizePromptOpen(true);
    }
    
    // Reseta flag após a verificação
    setShouldCheckCompletion(false);
  }, [shouldCheckCompletion, stats.totalReceived, stats.totalContractValue, stats.totalRevenueRealized, currentOrder.status, isFinalizePromptOpen, isProcessing]);

  const handleReceiptSuccess = () => {
    // Dá um pequeno atraso para o TanStack Query atualizar os stats antes da verificação
    setTimeout(() => setShouldCheckCompletion(true), 1500);
  };


  const handleOpenPdf = (variant: 'producer' | 'internal') => {
    setPdfVariant(variant);
    setIsPdfOpen(true);
  };

  return (
    <div className="animate-in slide-in-from-right-4 duration-300 pb-20">
      {/* 1. Bar de Ações e Título */}
      <SalesOrderActionButtons 
        orderNumber={currentOrder.number}
        orderStatus={currentOrder.status}
        onBack={onBack}
        onEdit={onEdit}
        onDelete={onDelete}
        onOpenPdf={handleOpenPdf}
        onReopen={async () => {
          setIsProcessing(true);
          try {
            await onReopen();
            addToast('success', 'Venda Reaberta com Sucesso');
            await refreshData(currentOrder.id);
          } finally {
            setIsProcessing(false);
          }
        }}
        onCancel={onCancel}
      />

      {/* 2. Cabeçalho de Dados Estáticos */}
      <SalesOrderHeader order={currentOrder} />

      {/* 3. Cards de Resumo Financeiro (KPIs) */}
      <SalesOrderKPIGrid 
        transitValue={stats.totalTransitValue}
        totalRevenueRealized={stats.totalRevenueRealized}
        totalReceived={stats.totalReceived}
        totalPending={stats.totalPending}
      />

      {/* 4. Resumo de Performance do Produto */}
      <SalesProductSummary order={currentOrder} loadings={loadings} />
      
      {/* 5. Tabela de Carregamentos */}
      <SalesLoadingsTable 
        loadings={loadings} 
        onNavigateToPurchase={(id) => navigateTo(ModuleId.PURCHASE_ORDER, id)} 
        onViewLoading={setSelectedLoading} 
      />

      {/* 6. Recebimentos e Notas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <SalesReceiptsCard 
          orderId={currentOrder.id}
          customerName={currentOrder.customerName || 'Cliente'}
          transactions={realTransactions}
          totalReceived={stats.totalReceived}
          totalPending={stats.totalPending}
          totalBilled={stats.totalRevenueRealized}
          receivedPercent={stats.receivedPercent}
          onRefresh={() => refreshData(currentOrder.id)}
          onReceiptSuccess={handleReceiptSuccess}
        />
        
        <SalesOrderNotesSection 
          notes={currentOrder.notesList || []}
          onAddNote={() => setIsNoteModalOpen(true)}
        />
      </div>

      {/* 7. Modais e Gerenciamento */}
      <NoteModal 
        isOpen={isNoteModalOpen} 
        onClose={() => setIsNoteModalOpen(false)} 
        onSave={(n) => { 
          const note = { ...n, id: Math.random().toString(36).substr(2, 9) }; 
          void saveNote(currentOrder, note); 
        }} 
        consultantName={currentOrder.consultantName || 'Auditante'} 
      />
      
      <SalesPdfPreviewModal 
        isOpen={isPdfOpen} 
        onClose={() => setIsPdfOpen(false)} 
        order={currentOrder} 
        loadings={loadings} 
        variant={pdfVariant} 
      />
      
      {selectedLoading && (
        <LoadingManagement 
          loading={selectedLoading} 
          onClose={() => setSelectedLoading(null)} 
          onUpdate={() => refreshData(currentOrder.id)} 
          originContext="sales" 
        />
      )}
      
      <ActionConfirmationModal 
        isOpen={isFinalizePromptOpen} 
        onClose={() => setIsFinalizePromptOpen(false)} 
        onConfirm={() => { onFinalize(); refreshData(currentOrder.id); setIsFinalizePromptOpen(false); }} 
        title="Saldo Quitado!" 
        description="Deseja marcar esta venda como finalizada no sistema?" 
        type="success" 
        confirmLabel="Finalizar Pedido" 
      />
    </div>
  );
};

export default SalesOrderDetails;
