
import { useState, useMemo } from 'react';
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

export interface CarrierGroup {
  name: string;
  totalBalance: number;
  totalAdvances: number; // Adiantamentos específicos do frete
  globalCredit: number; // NOVO: Saldo de adiantamentos globais do financeiro
  freights: Freight[];
  count: number;
}

export const useFreightFinancials = (freights: Freight[], onRefresh: () => void) => {
  const [selectedCarrier, setSelectedCarrier] = useState<CarrierGroup | null>(null);
  const [selectedFreightIds, setSelectedFreightIds] = useState<string[]>([]);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const { addToast } = useToast();
  const { data: loadings = [] } = useLoadings();
  const queryClient = useQueryClient();

  const { data: advanceSummaries = [] } = useAdvanceSummaries();

  // Agrupamento por Transportadora
  const carrierGroups = useMemo(() => {
    const groups: Record<string, CarrierGroup> = {};

    freights.forEach(f => {
      // Inclui fretes com saldo devedor OU adiantamentos realizados OU status não pago
      if (f.balanceValue > 0.05 || f.advanceValue > 0 || f.financialStatus !== 'paid') {
        if (!groups[f.carrierName]) {
          // Tenta encontrar o saldo global deste parceiro pelo nome (ideal seria ID, mas usamos nome p/ compatibilidade)
          const partnerAdvance = advanceSummaries.find(a => a.partnerName === f.carrierName);
          const globalCredit = partnerAdvance && partnerAdvance.netBalance > 0 ? partnerAdvance.netBalance : 0;

          groups[f.carrierName] = {
            name: f.carrierName,
            totalBalance: 0,
            totalAdvances: 0,
            globalCredit: globalCredit,
            freights: [],
            count: 0
          };
        }
        groups[f.carrierName].freights.push(f);
        groups[f.carrierName].totalBalance += f.balanceValue;
        groups[f.carrierName].totalAdvances += f.advanceValue;
        groups[f.carrierName].count += 1;
      }
    });

    // Também verifica se tem transportadoras que não têm frete pendente mas têm saldo de adiantamento (opcional, mas bom pra gestão)
    // Por enquanto, focamos em quem tem frete.

    return Object.values(groups).sort((a, b) => b.totalBalance - a.totalBalance);
  }, [freights, advanceSummaries]);

  // Total Selecionado para Pagamento
  const totalSelectedToPay = useMemo(() => {
    if (!selectedCarrier) return 0;
    return selectedCarrier.freights
      .filter(f => selectedFreightIds.includes(f.id))
      .reduce((acc, f) => acc + f.balanceValue, 0);
  }, [selectedCarrier, selectedFreightIds]);

  // --- ACTIONS ---

  const openCarrierModal = (group: CarrierGroup) => {
    setSelectedCarrier(group);
    setSelectedFreightIds([]);
  };

  const closeCarrierModal = () => {
    setSelectedCarrier(null);
    setSelectedFreightIds([]);
    setIsPayModalOpen(false);
  };

  const toggleSelectFreight = (id: string) => {
    setSelectedFreightIds(prev =>
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!selectedCarrier) return;
    if (selectedFreightIds.length === selectedCarrier.freights.length) {
      setSelectedFreightIds([]);
    } else {
      setSelectedFreightIds(selectedCarrier.freights.map(f => f.id));
    }
  };

  const openPaymentModal = () => {
    if (selectedFreightIds.length > 0) setIsPayModalOpen(true);
  };

  const confirmPayment = async (data: any) => {
    if (!selectedCarrier) return;
    try {
    let remainingMoney = Number(data.amount) || 0;
    let remainingDiscount = Number(data.discount) || 0;
    const isUsingAdvance = data.useAdvanceBalance === true;
    let parentAdvanceForNotes: any = null;

    // Se usar saldo, precisamos registrar o consumo do adiantamento
    if (isUsingAdvance && remainingMoney > 0) {
      // Encontra o ID do parceiro através de um dos fretes
      const loadingRef = loadings.find((l: any) => l.id === selectedFreightIds[0]);
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
          advanceDate: data.date,
          description: `Consumo de Saldo p/ Baixa de Fretes (Placas: ${selectedCarrier.freights.filter(f => selectedFreightIds.includes(f.id)).map(f => f.vehiclePlate).join(', ')})`
        } as any);
      }
    }

    // ALGORITMO DE DISTRIBUIÇÃO (Rateio)
    const freightsToPay = selectedCarrier.freights
      .filter(f => selectedFreightIds.includes(f.id))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const freight of freightsToPay) {
      const loading = loadings.find((l: any) => l.id === freight.id);

      if (loading && (remainingMoney > 0 || remainingDiscount > 0)) {
        const currentDebt = loading.totalFreightValue - loading.freightPaid;

        if (currentDebt <= 0.05) continue;

        const paymentPart = Math.min(currentDebt, remainingMoney);
        const debtAfterCash = currentDebt - paymentPart;
        const discountPart = Math.min(debtAfterCash, remainingDiscount);

        if (paymentPart > 0 || discountPart > 0) {
          let customAccountName = data.accountName;
          if (isUsingAdvance && parentAdvanceForNotes) {
            let dateStr = 'Data Inválida';
            if (parentAdvanceForNotes.advance_date) {
              const parts = parentAdvanceForNotes.advance_date.split('-');
              if (parts.length === 3) {
                dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
              } else {
                dateStr = new Date(parentAdvanceForNotes.advance_date).toLocaleDateString();
              }
            }
            const valStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parentAdvanceForNotes.amount);
            customAccountName = `Adiantamento (${dateStr} - ${valStr})`;
          } else if (isUsingAdvance) {
             customAccountName = 'Adiantamento';
          }

          const payload = {
            amount: paymentPart,
            date: data.date,
            discount: discountPart,
            accountId: isUsingAdvance ? VIRTUAL_ACCOUNT_ID : data.accountId, // Se usar adiantamento, não mexe no banco
            accountName: customAccountName,
            notes: `${data.notes || 'Baixa de Frete'} ${isUsingAdvance ? `(Via ${customAccountName})` : ''} - Placa ${freight.vehiclePlate}`
          };

          // ✅ AWAIT: Esperar processamento financeiro
          await freightService.addFreightPayment(loading as any, payload);

          remainingMoney -= paymentPart;
          remainingDiscount -= discountPart;
        }
      }
    }

    setIsPayModalOpen(false);
    closeCarrierModal();
    addToast('success', 'Pagamento de frete registrado com sucesso!');

    // Invalida caches relevantes via TanStack Query (SKIL: sem window.location.reload)
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOADINGS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FREIGHTS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TRANSACTIONS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADVANCES });
    onRefresh();
    } catch (err) {
      addToast('error', 'Erro ao registrar pagamento. Verifique a conexão e tente novamente.');
    }
  };

  return {
    carrierGroups,
    selectedCarrier,
    selectedFreightIds,
    isPayModalOpen,
    setIsPayModalOpen,
    totalSelectedToPay,
    actions: {
      openCarrierModal,
      closeCarrierModal,
      toggleSelectFreight,
      toggleSelectAll,
      openPaymentModal,
      confirmPayment
    }
  };
};
