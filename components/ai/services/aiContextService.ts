
import { partnerService } from '../../../services/partnerService';
import { purchaseService } from '../../../services/purchaseService';
import { salesService } from '../../../services/salesService';
import { loadingService } from '../../../services/loadingService';
import { financialActionService } from '../../../services/financialActionService';
import { shareholderService } from '../../../services/shareholderService';
import { financialService } from '../../../services/financialService';
import { financialIntegrationService } from '../../../services/financialIntegrationService';
import { aiMemoryService } from './aiMemoryService';

export const aiContextService = {
  getSystemContext: (userName: string) => {
    // Coleta dados completos
    const purchases = purchaseService.getAll();
    const sales = salesService.getAll();
    const loadings = loadingService.getAll().filter(l => l.status !== 'canceled');
    const bankAccounts = financialService.getBankAccountsWithBalances();
    const payables = financialIntegrationService.getPayables();
    const receivables = financialIntegrationService.getReceivables();

    const formatMoney = (val: number) => `R$${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    // TOP 10 pendências (expandido de 3)
    const listPurchasesToPay = payables
        .filter(r => r.subType === 'purchase_order' && r.status !== 'paid')
        .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 10)
        .map(r => `${r.entityName}: ${formatMoney(r.originalValue - r.paidValue)} (vence ${new Date(r.dueDate).toLocaleDateString('pt-BR')})`)
        .join('; ');

    const listSalesToReceive = receivables
        .filter(r => r.subType === 'sales_order' && r.status !== 'paid')
        .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 10)
        .map(r => `${r.entityName}: ${formatMoney(r.originalValue - r.paidValue)} (vence ${new Date(r.dueDate).toLocaleDateString('pt-BR')})`)
        .join('; ');

    // ✅ PESO DE DESCARREGO DOS VEÍCULOS
    const totalWeightLoaded = loadings.reduce((acc, l) => acc + (l.grossWeightKg || 0), 0);
    const totalWeightUnloaded = loadings.reduce((acc, l) => acc + (l.netWeightKg || 0), 0);
    const totalBreakage = loadings.reduce((acc, l) => acc + (l.breakageKg || 0), 0);
    
    const recentLoadings = loadings
      .sort((a, b) => new Date(b.unloadDate || b.loadDate).getTime() - new Date(a.unloadDate || a.loadDate).getTime())
      .slice(0, 5)
      .map(l => `${l.driver || 'Sem motorista'} - Placa ${l.vehiclePlate || 'N/A'}: Bruto ${l.grossWeightKg || 0}kg, Líquido ${l.netWeightKg || 0}kg, Quebra ${l.breakageKg || 0}kg`)
      .join('; ');

    const totalSaldoBancos = bankAccounts.reduce((acc, b) => acc + b.currentBalance, 0);
    const learnedRules = aiMemoryService.getMemories().map(m => m.rule).join('; ');

    // ✅ Contexto EXPANDIDO com dados históricos
    const context = {
      user: userName,
      date: new Date().toLocaleDateString('pt-BR'),
      financial: {
        total_cash: formatMoney(totalSaldoBancos),
        banks: bankAccounts.map(b => `${b.bankName}: ${formatMoney(b.currentBalance)}`).join(' | ')
      },
      pending: {
        to_pay: listPurchasesToPay || "Nada pendente",
        to_receive: listSalesToReceive || "Nada a receber"
      },
      operations: {
        total_purchases: purchases.length,
        total_sales: sales.length,
        total_loadings: loadings.length
      },
      logistics: {
        total_weight_loaded: `${totalWeightLoaded.toLocaleString()} kg`,
        total_weight_unloaded: `${totalWeightUnloaded.toLocaleString()} kg`,
        total_breakage: `${totalBreakage.toLocaleString()} kg`,
        recent_loadings: recentLoadings || "Nenhum carregamento recente"
      },
      memory: learnedRules || "Nenhuma regra memorizada"
    };

    return JSON.stringify(context, null, 2);
  }
};
