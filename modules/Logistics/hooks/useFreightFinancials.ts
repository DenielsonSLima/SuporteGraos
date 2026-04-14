
import { useState, useMemo } from 'react';
import { Freight } from '../types';
import { financialActionService } from '../../../services/financialActionService';
import { advanceService } from '../../Financial/Advances/services/advanceService';
import { useLoadings } from '../../../hooks/useLoadings';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../hooks/queryKeys';
import { useToast } from '../../../contexts/ToastContext';
import { useAdvanceSummaries } from '../../../hooks/useAdvances';

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

    // Se usar saldo, precisamos registrar o débito no módulo de adiantamentos
    if (isUsingAdvance && remainingMoney > 0) {
      // Encontra o ID do parceiro através de um dos fretes (assumindo mesmo ID) or busca no service
      const loadingRef = loadings.find((l: any) => l.id === selectedFreightIds[0]);
      if (loadingRef) {
        advanceService.addTransaction({
          partnerId: loadingRef.carrierId,
          partnerName: loadingRef.carrierName,
          type: 'taken', // TAKEN reduz o saldo (é como se tivéssemos "recebido" o serviço pago com o adiantamento)
          date: data.date,
          value: remainingMoney,
          description: `Baixa de Fretes (Placas: ${selectedCarrier.freights.filter(f => selectedFreightIds.includes(f.id)).map(f => f.vehiclePlate).join(', ')})`
        });
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
          const payload = {
            ...data,
            amount: paymentPart,
            discount: discountPart,
            accountId: isUsingAdvance ? 'advance_virtual' : data.accountId, // Se usar adiantamento, não mexe no banco
            accountName: isUsingAdvance ? 'SALDO ADIANTAMENTO' : data.accountName,
            notes: `${data.notes || 'Baixa de Frete'} ${isUsingAdvance ? '(Via Adiantamento)' : ''} - Placa ${freight.vehiclePlate}`
          };

          // ✅ AWAIT: Esperar processamento financeiro
          await financialActionService.processRecord(`fr-${loading.id}`, payload, 'freight');

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
