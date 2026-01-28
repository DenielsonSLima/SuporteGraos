
import { useState, useMemo } from 'react';
import { Freight } from '../types';
import { loadingService } from '../../../services/loadingService';
import { financialActionService } from '../../../services/financialActionService';
import { advanceService } from '../../Financial/Advances/services/advanceService';
import { useToast } from '../../../contexts/ToastContext';

export const useCarrierFinancials = (carrierName: string, allFreights: Freight[], onRefreshParent: () => void) => {
  const { addToast } = useToast();
  const [selectedFreightIds, setSelectedFreightIds] = useState<string[]>([]);
  
  const carrierFreights = useMemo(() => {
    return allFreights.filter(f => f.carrierName === carrierName && (f.balanceValue > 0.05 || f.financialStatus !== 'paid'));
  }, [allFreights, carrierName]);

  // Busca saldo global
  const globalCredit = useMemo(() => {
     const summary = advanceService.getSummaries().find(s => s.partnerName === carrierName);
     return summary && summary.netBalance > 0 ? summary.netBalance : 0;
  }, [carrierName]);

  const totals = useMemo(() => {
    const totalDebt = carrierFreights.reduce((acc, f) => acc + f.balanceValue, 0);
    const totalAdvances = carrierFreights.reduce((acc, f) => acc + f.advanceValue, 0);
    
    const selectedDebt = carrierFreights
        .filter(f => selectedFreightIds.includes(f.id))
        .reduce((acc, f) => acc + f.balanceValue, 0);

    return { totalDebt, totalAdvances, selectedDebt, globalCredit };
  }, [carrierFreights, selectedFreightIds, globalCredit]);

  const toggleFreightSelection = (id: string) => {
    setSelectedFreightIds(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedFreightIds.length === carrierFreights.length) {
      setSelectedFreightIds([]);
    } else {
      setSelectedFreightIds(carrierFreights.map(f => f.id));
    }
  };

  const processPayment = (paymentData: any) => {
    let remainingMoney = Number(paymentData.amount) || 0;
    let remainingDiscount = Number(paymentData.discount) || 0;
    const isUsingAdvance = paymentData.useAdvanceBalance === true;

    // Se usar saldo, precisamos registrar o débito no módulo de adiantamentos
    if (isUsingAdvance && remainingMoney > 0) {
        // Pega ID do parceiro de uma das cargas
        const loadingRef = loadingService.getAll().find(l => l.id === selectedFreightIds[0]);
        if (loadingRef) {
            advanceService.addTransaction({
                partnerId: loadingRef.carrierId,
                partnerName: loadingRef.carrierName,
                type: 'taken', // TAKEN reduz o saldo (consumo do crédito)
                date: paymentData.date,
                value: remainingMoney,
                description: `Baixa de Fretes (Ref: ${loadingRef.vehiclePlate} e outros)`
            });
        }
    }

    const freightsToPay = carrierFreights
        .filter(f => selectedFreightIds.includes(f.id))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let paidCount = 0;

    freightsToPay.forEach(freight => {
        const loading = loadingService.getAll().find(l => l.id === freight.id);
        
        if (loading && (remainingMoney > 0 || remainingDiscount > 0)) {
            const currentDebt = loading.totalFreightValue - loading.freightPaid;

            if (currentDebt <= 0.05) return; 

            const paymentPart = Math.min(currentDebt, remainingMoney);
            const debtAfterCash = currentDebt - paymentPart;
            const discountPart = Math.min(debtAfterCash, remainingDiscount);

            if (paymentPart > 0 || discountPart > 0) {
                const payload = {
                    ...paymentData,
                    amount: paymentPart,
                    discount: discountPart,
                    accountId: isUsingAdvance ? 'advance_virtual' : paymentData.accountId,
                    accountName: isUsingAdvance ? 'SALDO ADIANTAMENTO' : paymentData.accountName,
                    notes: paymentData.notes ? `${paymentData.notes} (Ref: ${freight.vehiclePlate})` : `Pagamento Frete ${freight.vehiclePlate}`
                };

                financialActionService.processRecord(`fr-${loading.id}`, payload, 'freight');

                remainingMoney -= paymentPart;
                remainingDiscount -= discountPart;
                paidCount++;
            }
        }
    });

    if (paidCount > 0) {
        addToast('success', 'Baixa Realizada', `${paidCount} fretes foram baixados com sucesso.`);
        setSelectedFreightIds([]);
        onRefreshParent();
    } else {
        addToast('warning', 'Nenhuma baixa', 'Verifique os valores ou seleção.');
    }
  };

  return {
    carrierFreights,
    selectedFreightIds,
    totals,
    actions: {
        toggleFreightSelection,
        selectAll,
        processPayment
    }
  };
};
