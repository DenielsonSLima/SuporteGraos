// modules/Partners/hooks/usePartnerDeleteModal.ts
// SKILL §5: Consolidação — usa useUpdatePartner em vez de partnerService direto
import { useMemo, useState } from 'react';
import { Partner } from '../partners.types';
import { purchaseService } from '../../../services/purchaseService';
import { salesService } from '../../../services/salesService';
import { payablesService } from '../../../services/financial/payablesService';
import { receivablesService } from '../../../services/financial/receivablesService';
import { useUpdatePartner } from '../../../hooks/useParceiros';

interface UsePartnerDeleteModalParams {
  partner: Partner | null;
  onClose: () => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}

export const usePartnerDeleteModal = ({ partner, onClose, addToast }: UsePartnerDeleteModalParams) => {
  const updatePartnerMutation = useUpdatePartner();
  const [isDeactivating, setIsDeactivating] = useState(false);

  const linkedData = useMemo(() => {
    if (!partner) {
      return {
        purchases: [],
        sales: [],
        payables: [],
        receivables: [],
        canDeactivate: false,
        canDelete: false,
        totalDebt: 0,
        totalReceivable: 0,
        hasPendingFinancial: false,
        hasActiveOrders: false
      };
    }

    const purchases = purchaseService.getAll().filter((purchase) => purchase.partnerId === partner.id && purchase.status !== 'canceled');
    const sales = salesService.getAll().filter((sale) => sale.customerId === partner.id && sale.status !== 'canceled');
    const payables = payablesService.getAll().filter((payable) => payable.partnerId === partner.id);
    const receivables = receivablesService.getAll().filter((receivable) => receivable.partnerId === partner.id);

    const totalDebt = payables.reduce((acc, payable) => acc + Math.max(0, payable.amount - payable.paidAmount), 0);
    const totalReceivable = receivables.reduce((acc, receivable) => acc + Math.max(0, receivable.amount - receivable.receivedAmount), 0);

    const hasPendingFinancial = totalDebt > 0 || totalReceivable > 0;
    const hasActiveOrders = purchases.length > 0 || sales.length > 0;

    const canDeactivate = !hasPendingFinancial && !hasActiveOrders;
    const canDelete = purchases.length === 0 && sales.length === 0 && payables.length === 0 && receivables.length === 0;

    return {
      purchases,
      sales,
      payables,
      receivables,
      totalDebt,
      totalReceivable,
      hasPendingFinancial,
      hasActiveOrders,
      canDeactivate,
      canDelete
    };
  }, [partner]);

  const handleDeactivate = async () => {
    if (!partner || !linkedData.canDeactivate) return;

    setIsDeactivating(true);
    try {
      await updatePartnerMutation.mutateAsync({
        id: partner.id,
        partner: { active: false }
      });
      addToast('success', 'Parceiro inativado com sucesso');
      onClose();
    } catch {
      addToast('error', 'Erro', 'Falha ao inativar parceiro');
    } finally {
      setIsDeactivating(false);
    }
  };

  return {
    linkedData,
    isDeactivating,
    handleDeactivate
  };
};
