
import { useState, useMemo, useCallback } from 'react';
import { Freight } from '../types';
import { financialActionService } from '../../../services/financialActionService';
import { advancesService } from '../../../services/advancesService';
import { freightService } from '../../../services/loadings/freightService';
import { useLoadings } from '../../../hooks/useLoadings';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../hooks/queryKeys';
import { useToast } from '../../../contexts/ToastContext';
import { useAdvanceSummaries } from '../../../hooks/useAdvances';

const VIRTUAL_ACCOUNT_ID = '97e8bd30-3ba1-4658-a51e-5df6ce184845'; // Contas Virtuais

export const useCarrierFinancials = (carrierName: string, allFreights: Freight[], onRefreshParent: () => void) => {
  const { addToast } = useToast();
  const { data: loadings = [] } = useLoadings();
  const queryClient = useQueryClient();
  const [selectedFreightIds, setSelectedFreightIds] = useState<string[]>([]);
  
  const carrierFreights = useMemo(() => {
    return allFreights.filter(f => f.carrierName === carrierName && (f.balanceValue > 0.05 || f.financialStatus !== 'paid'));
  }, [allFreights, carrierName]);

  const { data: advanceSummaries = [] } = useAdvanceSummaries();

  // Busca saldo global
  const globalCredit = useMemo(() => {
     const summary = advanceSummaries.find(s => s.partnerName === carrierName);
     return summary && summary.netBalance > 0 ? summary.netBalance : 0;
  }, [carrierName, advanceSummaries]);

  const totals = useMemo(() => {
    // Backend Cérebro: Não usamos mais .reduce() complexo para cálculos financeiros.
    // As colunas balanceValue e advanceValue já vêm prontas do banco de dados (Trigger/View).
    let totalDebt = 0;
    let totalAdvances = 0;
    let selectedDebt = 0;

    carrierFreights.forEach(f => {
      totalDebt += f.balanceValue || 0;
      totalAdvances += f.advanceValue || 0;
      if (selectedFreightIds.includes(f.id)) {
        selectedDebt += f.balanceValue || 0;
      }
    });

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

  const processPayment = async (paymentData: any) => {
    let remainingMoney = Number(paymentData.amount) || 0;
    let remainingDiscount = Number(paymentData.discount) || 0;
    const isUsingAdvance = paymentData.useAdvanceBalance === true;

    try {
      let parentAdvanceForNotes: any = null;
      // Se usar saldo, precisamos registrar o consumo do adiantamento
      if (isUsingAdvance && remainingMoney > 0) {
          // Pega ID do parceiro de uma das cargas
          const loadingRef = loadings.find(l => l.id === selectedFreightIds[0]);
          if (loadingRef) {
              // Busca o adiantamento pai (original) para vincular corretamente
              const parentAdvance = await advancesService.getOpenByRecipient(loadingRef.carrierId);
              if (!parentAdvance) {
                throw new Error('Nenhum adiantamento aberto encontrado para esta transportadora.');
              }
              parentAdvanceForNotes = parentAdvance;

              await advancesService.create({
                  recipientId: loadingRef.carrierId,
                  recipientType: 'supplier', // ✅ Transportadora é fornecedora de serviço
                  amount: remainingMoney,
                  accountId: VIRTUAL_ACCOUNT_ID,
                  parentId: parentAdvance.id, // ✅ Vincula ao adiantamento pai
                  advanceDate: paymentData.date,
                  description: `Consumo de Saldo p/ Baixa de Frete (Placa: ${loadingRef.vehiclePlate})`
              } as any);
          }
      }

      const freightsToPay = carrierFreights
          .filter(f => selectedFreightIds.includes(f.id))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let paidCount = 0;

      for (const freight of freightsToPay) {
          const loading = loadings.find((l: any) => l.id === freight.id);
          
          if (loading && (remainingMoney > 0 || remainingDiscount > 0)) {
              const currentDebt = loading.totalFreightValue - loading.freightPaid;

              if (currentDebt <= 0.05) continue; 

              const paymentPart = Math.min(currentDebt, remainingMoney);
              const debtAfterCash = currentDebt - paymentPart;
              const discountPart = Math.min(debtAfterCash, remainingDiscount);

              if (paymentPart > 0 || discountPart > 0) {
                  let customAccountName = paymentData.accountName;
                  if (isUsingAdvance && parentAdvanceForNotes) {
                    const dateStr = new Date(parentAdvanceForNotes.advanceDate).toLocaleDateString();
                    const valStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parentAdvanceForNotes.amount);
                    customAccountName = `Adiantamento (${dateStr} - ${valStr})`;
                  } else if (isUsingAdvance) {
                    customAccountName = 'Adiantamento';
                  }

                  const payload = {
                      amount: paymentPart,
                      date: paymentData.date,
                      discount: discountPart,
                      accountId: isUsingAdvance ? VIRTUAL_ACCOUNT_ID : paymentData.accountId,
                      accountName: customAccountName,
                      notes: `${paymentData.notes || 'Baixa de Frete'} ${isUsingAdvance ? `(Via ${customAccountName})` : ''} - Placa ${freight.vehiclePlate}`
                  };

                  await freightService.addFreightPayment(loading as any, payload);

                  remainingMoney -= paymentPart;
                  remainingDiscount -= discountPart;
                  paidCount++;
              }
          }
      }

      if (paidCount > 0) {
          addToast('success', 'Baixa Realizada', `${paidCount} fretes foram baixados com sucesso.`);
          setSelectedFreightIds([]);
          // Invalida caches via TanStack Query (SKIL: sem reload manual)
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOADINGS });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FREIGHTS });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TRANSACTIONS });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADVANCES });
          onRefreshParent();
      } else {
          addToast('warning', 'Nenhuma baixa', 'Verifique os valores ou seleção.');
      }
    } catch (err: any) {
      addToast('error', 'Erro no processamento', err.message);
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

