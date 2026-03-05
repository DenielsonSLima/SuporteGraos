import { useMemo, useState } from 'react';
import { FinancialRecord } from '../../types';
import { ModuleId } from '../../../../types';
import { financialActionService } from '../../../../services/financialActionService';
import { purchaseService } from '../../../../services/purchaseService';
import { salesService } from '../../../../services/salesService';
import { standaloneRecordsService } from '../../../../services/standaloneRecordsService';
import { financialHistoryService } from '../../../../services/financial/financialHistoryService';

interface UseFinancialRecordDetailsModalParams {
  record: FinancialRecord;
  onClose: () => void;
  onRefresh: () => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}

export function useFinancialRecordDetailsModal({
  record,
  onClose,
  onRefresh,
  addToast,
}: UseFinancialRecordDetailsModalParams) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);

  const isManual = record.subType === 'admin';
  const isSystem = !isManual;

  const systemicTransactions = useMemo(() => {
    if (!isSystem) return [];
    if (record.subType === 'purchase_order') {
      const orderId = record.id.replace('po-grain-', '');
      return purchaseService.getById(orderId)?.transactions || [];
    }
    if (record.subType === 'sales_order') {
      const orderId = record.id.replace('so-', '');
      return salesService.getById(orderId)?.transactions || [];
    }
    return [];
  }, [record, isSystem]);

  const handleDelete = async () => {
    if (standaloneRecordsService.getById(record.id)) {
      await standaloneRecordsService.delete(record.id);
      addToast('success', 'Registro Avulso Excluído');
      onRefresh();
      onClose();
      return;
    }

    if (financialHistoryService.getById(record.id)) {
      await financialHistoryService.delete(record.id);
      addToast('success', 'Registro Estornado', 'Um estorno compensatório foi criado no histórico.');
      onRefresh();
      onClose();
      return;
    }

    if (isSystem) {
      addToast('warning', 'Registro Bloqueado', 'Para excluir um saldo de pedido, você deve estornar os pagamentos individuais ou excluir o pedido na origem.');
      return;
    }

    (financialActionService as any).deleteStandaloneRecord?.(record.id);
    addToast('success', 'Registro Excluído');
    onRefresh();
    onClose();
  };

  const handleUpdateTx = (updated: any) => {
    if (record.subType === 'purchase_order') {
      purchaseService.updateTransaction(record.id.replace('po-grain-', ''), updated);
    } else if (record.subType === 'sales_order') {
      salesService.updateTransaction(record.id.replace('so-', ''), updated);
    }
    onRefresh();
    setSelectedTx(null);
    addToast('success', 'Pagamento Atualizado');
  };

  const handleDeleteTx = (id: string) => {
    if (record.subType === 'purchase_order') {
      purchaseService.deleteTransaction(record.id.replace('po-grain-', ''), id);
    } else if (record.subType === 'sales_order') {
      salesService.deleteTransaction(record.id.replace('so-', ''), id);
    }
    onRefresh();
    setSelectedTx(null);
    addToast('success', 'Pagamento Estornado');
  };

  const handleNavigateToOrigin = () => {
    const moduleId = record.subType === 'purchase_order' ? ModuleId.PURCHASE_ORDER : ModuleId.SALES_ORDER;
    const orderId = record.id.replace('po-grain-', '').replace('so-', '');
    window.dispatchEvent(new CustomEvent('app:navigate', { detail: { moduleId, orderId } }));
    onClose();
  };

  return {
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    selectedTx,
    setSelectedTx,
    isSystem,
    systemicTransactions,
    handleDelete,
    handleUpdateTx,
    handleDeleteTx,
    handleNavigateToOrigin,
  };
}
