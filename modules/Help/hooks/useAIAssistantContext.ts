import { useCallback } from 'react';
import { partnerService } from '../../../services/partnerService';
import { purchaseService } from '../../../services/purchaseService';
import { salesService } from '../../../services/salesService';
import { loadingService } from '../../../services/loadingService';
import { financialActionService } from '../../../services/financialActionService';
import { shareholderService } from '../../../services/shareholderService';
import { financialService } from '../../../services/financialService';
import { useCurrentUser } from '../../../hooks/useCurrentUser';

export const useAIAssistantContext = () => {
  const currentUser = useCurrentUser();

  const getSystemContext = useCallback(() => {
    const partners = partnerService.getAll();
    const purchases = purchaseService.getAll();
    const sales = salesService.getAll();
    const loadings = loadingService.getAll().filter((loading) => loading.status !== 'canceled');
    const accounts = financialService.getBankAccounts();
    const shareholders = shareholderService.getAll();
    const standalone = financialActionService.getStandaloneRecords();

    const totalQuebraKg = loadings.reduce((acc, loading) => acc + (loading.breakageKg || 0), 0);
    const totalFinanceiroAberto = standalone
      .filter((record) => record.status !== 'paid')
      .reduce((acc, record) => acc + (record.remainingValue || 0), 0);

    const context = {
      empresa: 'Suporte Grãos ERP v1.8',
      usuario_atual: currentUser?.name,
      cargo_usuario: currentUser?.role,
      insights_do_dia: {
        pedidos_compra: purchases.filter((purchase) => purchase.status !== 'completed').length,
        pedidos_venda: sales.filter((sale) => sale.status !== 'completed').length,
        total_quebra_logistica_kg: totalQuebraKg,
        contas_pendentes_total: totalFinanceiroAberto,
        socios_em_credito: shareholders
          .filter((shareholder) => shareholder.financial.currentBalance > 0)
          .map((shareholder) => shareholder.name),
        ultima_carga: loadings[0]
          ? `Placa ${loadings[0].vehiclePlate} (${loadings[0].carrierName})`
          : 'Sem cargas registradas',
        total_parceiros: partners.length,
        total_contas_bancarias: accounts.length
      },
      manual_base:
        'Venda baseada em peso destino (balança cliente). Compra baseada em peso origem (balança fazenda). Frete pode ser por origem ou destino. Quebras acima de 0.25% exigem auditoria. Lucro Líquido = Receita - (Grão + Frete + Despesas).'
    };

    return JSON.stringify(context);
  }, [currentUser]);

  return {
    currentUser,
    getSystemContext
  };
};
