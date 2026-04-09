
// aiContextService.ts - ASYNC (Foundation V3)
// Usamos importações dinâmicas para quebrar TODOS os ciclos de dependência
// Isso garante que os serviços só sejam carregados quando a IA for realmente usada.

export const aiContextService = {
  getSystemContext: async (userName: string): Promise<string> => {
    try {
      // 📥 Importações dinâmicas paralelas
      const [
        { purchaseService },
        { salesService },
        { loadingService },
        { financialService },
        { financialIntegrationService },
        { aiMemoryService }
      ] = await Promise.all([
        import('../../../services/purchaseService'),
        import('../../../services/salesService'),
        import('../../../services/loadingService'),
        import('../../../services/financialService'),
        import('../../../services/financialIntegrationService'),
        import('./aiMemoryService')
      ]);

      // Coleta dados completos com GUARDS
      const purchases = purchaseService?.getAll?.() || [];
      const sales = salesService?.getAll?.() || [];
      const loadings = (loadingService?.getAll?.() || []).filter(l => l && l.status !== 'canceled');
      const bankAccounts = financialService?.getBankAccountsWithBalances?.() || [];
      const payables = (await financialIntegrationService?.getPayables?.()) || [];
      const receivables = (await financialIntegrationService?.getReceivables?.()) || [];

      const formatMoney = (val: number) => `R$${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

      // TOP 10 pendências
      const listPurchasesToPay = payables
        .filter(r => r.subType === 'purchase_order' && r.status !== 'paid')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 10)
        .map(r => `${r.entityName}: ${formatMoney(r.originalValue - r.paidValue)} (vence ${new Date(r.dueDate).toLocaleDateString('pt-BR')})`)
        .join('; ');

      const listSalesToReceive = receivables
        .filter(r => r.subType === 'sales_order' && r.status !== 'paid')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 10)
        .map(r => `${r.entityName}: ${formatMoney(r.originalValue - r.paidValue)} (vence ${new Date(r.dueDate).toLocaleDateString('pt-BR')})`)
        .join('; ');

      // ✅ PESO DE DESCARREGO DOS VEÍCULOS
      const totalWeightLoaded = (loadings || []).reduce((acc, l: any) => acc + (l?.weightKg || 0), 0);
      const totalWeightUnloaded = (loadings || []).reduce((acc, l: any) => acc + (l?.unloadWeightKg || 0), 0);
      const totalBreakage = (loadings || []).reduce((acc, l: any) => acc + (l?.breakageKg || 0), 0);

      const recentLoadings = (loadings || [])
        .sort((a: any, b: any) => new Date(b?.date || 0).getTime() - new Date(a?.date || 0).getTime())
        .slice(0, 5)
        .map((l: any) => `${l?.driverName || 'Sem motorista'} - Placa ${l?.vehiclePlate || 'N/A'}: Bruto ${l?.weightKg || 0}kg, Destino ${l?.unloadWeightKg || 0}kg, Quebra ${l?.breakageKg || 0}kg`)
        .join('; ');

      const totalSaldoBancos = (bankAccounts || []).reduce((acc, b) => acc + (b?.currentBalance || 0), 0);
      const learnedRules = (aiMemoryService?.getMemories?.() || []).map(m => m?.rule).filter(Boolean).join('; ');

      // ✅ Contexto
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
    } catch (err) {
      console.error('[AI Context] Erro crítico ao gerar contexto:', err);
      return '{}';
    }
  }
};
