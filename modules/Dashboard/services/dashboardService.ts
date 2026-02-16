
import { DashboardCache } from '../../../services/dashboardCache';
import { CashierCache } from '../../../services/cashierCache';
import { assetService } from '../../../services/assetService';
import { initialBalanceService } from '../../../services/initialBalanceService';

export const dashboardService = {
  getOperationalKPIs: () => {
    // 1. Definição do Período (Últimos 30 dias para "Operacional Recente")
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);

    // 📦 OTIMIZAÇÃO: Usa cache centralizado (1 leitura em vez de 4)
    const cache = DashboardCache.load();
    const allPurchases = cache.purchases;
    const allSales = cache.sales;
    const allLoadings = cache.loadings;
    const allPayables = cache.payables;

    // Filtros de Data
    const recentPurchases = allPurchases.filter(p => new Date(p.date) >= thirtyDaysAgo && p.status !== 'canceled');
    const recentSales = allSales.filter(s => new Date(s.date) >= thirtyDaysAgo && s.status !== 'canceled');

    // --- 1. VOLUME MOVIMENTADO (BASEADO EM CARGAS REAIS) ---
    const validLoadings = allLoadings.filter(l =>
      ['loaded', 'in_transit', 'completed', 'unloading', 'redirected'].includes(l.status) &&
      new Date(l.date) >= thirtyDaysAgo
    );

    const totalVolumeKg = validLoadings.reduce((acc, l) => acc + l.weightKg, 0);
    const totalVolumeSc = totalVolumeKg / 60;
    const totalVolumeTon = totalVolumeKg / 1000;

    const totalOrdersCount = recentPurchases.length + recentSales.length;

    // --- 2. MÉDIAS FINANCEIRAS REAIS (BASEADO EM CARGAS) ---
    // AQUI ESTAVA O ERRO: Usar loading.totalPurchaseValue garante que pegamos o custo real da carga

    const totalLoadedPurchaseValue = validLoadings.reduce((acc, l) => acc + (l.totalPurchaseValue || 0), 0);
    const avgPurchasePrice = totalVolumeSc > 0 ? totalLoadedPurchaseValue / totalVolumeSc : 0;

    const totalLoadedSalesValue = validLoadings.reduce((acc, l) => acc + (l.totalSalesValue || 0), 0);
    const avgSalesPrice = totalVolumeSc > 0 ? totalLoadedSalesValue / totalVolumeSc : 0;

    const totalLoadedFreightValue = validLoadings.reduce((acc, l) => acc + (l.totalFreightValue || 0), 0);

    // Média Frete por Tonelada
    let freightSumPerTon = 0;
    let freightCount = 0;
    validLoadings.forEach(l => {
      if (l.freightPricePerTon > 0) {
        freightSumPerTon += l.freightPricePerTon;
        freightCount++;
      }
    });
    const avgFreightPriceTon = freightCount > 0 ? freightSumPerTon / freightCount : 0;

    // --- 3. CUSTOS & LUCRO ESTIMADO ---

    // Despesas Administrativas do período (Rateio simples pelo volume operado não é exato, mas serve para estimativa)
    const adminExpenses = allPayables
      .filter(p => (p.subType === 'admin' || p.subType === 'commission') && new Date(p.issueDate) >= thirtyDaysAgo)
      .reduce((acc, p) => acc + p.originalValue, 0);

    // Custo Total da Operação = Custo Grão (Cargas) + Custo Frete (Cargas) + Despesas (Geral)
    const totalOperationalCost = totalLoadedPurchaseValue + totalLoadedFreightValue + adminExpenses;

    // Base de divisão: Se não tiver volume carregado, usamos 1 para evitar div/0
    const volumeBase = totalVolumeSc > 0 ? totalVolumeSc : 1;

    // Custo Médio por Saca (Grão + Frete + Despesas)
    const avgCostPerSc = totalOperationalCost / volumeBase;

    // Lucro Médio por Saca = Preço Médio Venda - Custo Médio Total
    // Se não houver venda registrada no período, o lucro aparece negativo (apenas custos)
    const avgProfitPerSc = totalVolumeSc > 0 ? (avgSalesPrice - avgCostPerSc) : 0;

    return {
      ordersLast30Days: totalOrdersCount,
      volumeSc: totalVolumeSc,
      volumeTon: totalVolumeTon,
      avgPurchasePrice,
      avgSalesPrice,
      avgFreightPriceTon,
      avgCostPerSc,
      avgProfitPerSc
    };
  },

  getRecentActivity: () => {
    // 📦 OTIMIZAÇÃO: Usa cache centralizado
    const cache = DashboardCache.load();

    // Latest 5 of each
    const freights = cache.loadings
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(l => ({
        id: l.id,
        desc: `Placa ${l.vehiclePlate}`,
        sub: `${l.carrierName}`,
        value: l.totalFreightValue,
        date: l.date
      }));

    const orders = [...cache.purchases, ...cache.sales]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(o => ({
        id: o.id,
        desc: 'customerName' in o ? (o as any).customerName : (o as any).partnerName,
        sub: 'customerName' in o ? 'Venda' : 'Compra',
        value: o.totalValue,
        date: o.date
      }));

    // Payments (Paid records)
    const payments = cache.payables
      .filter(p => p.paidValue > 0)
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()) // sort by issue or payment date
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        desc: p.description,
        sub: p.entityName,
        value: p.paidValue,
        date: p.issueDate // Should be payment date ideally
      }));

    return { freights, orders, payments };
  },

  getFinancialPending: () => {
    // 📦 OTIMIZAÇÃO: Usa cache centralizado
    const cache = DashboardCache.load();

    // Helper to sort by due date ascending (urgency)
    const sortByDate = (a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();

    // 1. Receivables (Vendas)
    const receivables = cache.receivables
      .filter(r => r.status !== 'paid')
      .sort(sortByDate)
      .slice(0, 5); // Top 5 urgency

    // 2. Payables (Trade: Purchases & Freight)
    const tradePayables = cache.payables
      .filter(r => r.status !== 'paid' && (r.subType === 'purchase_order' || r.subType === 'freight'))
      .sort(sortByDate)
      .slice(0, 5);

    // 3. Expenses (Admin & Commissions)
    // We source from standalone records for purity of "Despesas"
    const expenses = cache.standaloneRecords
      .filter(r => r.status !== 'paid' && r.subType === 'admin')
      .sort(sortByDate)
      .slice(0, 5);

    return {
      receivables,
      tradePayables,
      expenses
    };
  },

  getShareholderRanking: () => {
    // 📦 OTIMIZAÇÃO: Usa cache centralizado
    const cache = DashboardCache.load();
    const purchases = cache.purchases;

    const ranking: Record<string, { name: string, total: number, count: number }> = {};

    purchases.forEach(p => {
      const consultant = p.consultantName || 'Não Informado';
      if (!ranking[consultant]) {
        ranking[consultant] = { name: consultant, total: 0, count: 0 };
      }
      ranking[consultant].total += p.totalValue;
      ranking[consultant].count += 1;
    });

    return Object.values(ranking).sort((a, b) => b.total - a.total);
  },

  getChartData: () => {
    // 📦 OTIMIZAÇÃO: Usa cache centralizado
    const cache = DashboardCache.load();

    const today = new Date();
    const months = [];
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    const purchases = cache.purchases;
    const sales = cache.sales;
    const loadings = cache.loadings;
    // Standalone inclui: Despesas Adm, Retiradas de Sócio, Empréstimos, Venda de Ativos
    const standaloneRecords = cache.standaloneRecords;

    // Helper: Verificar se data está no mês/ano
    const isInMonth = (dateStr: string, month: number, year: number) => {
      const d = new Date(dateStr);
      // Ajuste de fuso horário simples para garantir consistência
      return d.getMonth() === month && d.getFullYear() === year;
    };

    // ⚡ OTIMIZAÇÃO CRÍTICA: Pre-processar TODOS os dados em UMA ÚNICA PASSADA
    // Em vez de iterar 3x por mês (15 loops), iteramos 1x por dataset (4 loops totais)
    const monthlyData = new Map<string, {
      revenue: number;
      expense: number;
      purchaseValue: number;
      purchaseSc: number;
      salesValue: number;
      salesSc: number;
    }>();

    // Inicializar estrutura para últimos 3 meses
    for (let i = 2; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyData.set(key, {
        revenue: 0,
        expense: 0,
        purchaseValue: 0,
        purchaseSc: 0,
        salesValue: 0,
        salesSc: 0
      });
    }

    // Loop 1: Processar TODAS as vendas (transactions)
    sales.forEach(s => {
      if (s.transactions) {
        s.transactions.forEach(t => {
          if (t.type === 'receipt') {
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            const month = monthlyData.get(key);
            if (month) {
              month.revenue += t.value;
            }
          }
        });
      }
    });

    // Loop 2: Processar TODAS as compras (transactions)
    purchases.forEach(p => {
      if (p.transactions) {
        p.transactions.forEach(t => {
          if (t.type === 'payment' || t.type === 'advance') {
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            const month = monthlyData.get(key);
            if (month) {
              month.expense += t.value;
            }
          }
        });
      }
    });

    // Loop 3: Processar TODOS os loadings (transactions + preços médios)
    loadings.forEach(l => {
      if (l.status !== 'canceled') {
        const d = new Date(l.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const month = monthlyData.get(key);

        if (month) {
          // Acumular valores para média
          month.purchaseValue += l.totalPurchaseValue || 0;
          month.purchaseSc += l.weightSc || 0;
          month.salesValue += l.totalSalesValue || 0;
          month.salesSc += l.weightSc || 0;
        }
      }

      // Processar transactions de frete
      if (l.transactions) {
        l.transactions.forEach(t => {
          if (t.type === 'payment' || t.type === 'advance') {
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            const monthData = monthlyData.get(key);
            if (monthData) {
              monthData.expense += t.value;
            }
          }
        });
      }
    });

    // Loop 4: Processar standalone records (entradas/saídas)
    standaloneRecords.forEach(r => {
      if (r.status === 'paid') {
        const d = new Date(r.issueDate);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const month = monthlyData.get(key);

        if (month) {
          // Entradas
          const isEntry =
            r.subType === 'loan_taken' ||
            r.category === 'Venda de Ativo' ||
            r.subType === 'receipt';

          if (isEntry) {
            month.revenue += r.paidValue;
          }

          // Saídas
          const isExit =
            r.subType === 'admin' ||
            r.subType === 'shareholder' ||
            r.subType === 'loan_granted' ||
            r.subType === 'commission';

          if (isExit) {
            month.expense += r.paidValue;
          }
        }
      }
    });

    // Montar array de retorno
    for (let i = 2; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const data = monthlyData.get(key)!;

      months.push({
        name: monthNames[d.getMonth()],
        revenue: data.revenue,
        expense: data.expense,
        avgPurchasePrice: data.purchaseSc > 0 ? data.purchaseValue / data.purchaseSc : 0,
        avgSalesPrice: data.salesSc > 0 ? data.salesValue / data.salesSc : 0
      });
    }

    return months;
  },

  getNetWorthHistory: () => {
    const cache = DashboardCache.load();
    const today = new Date();
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    // Forçar atualização do cache do Cashier (garantir dados frescos)
    CashierCache.invalidate();
    const currentReport = cache.cashierReport;

    const history: Array<{
      name: string;
      netWorth: number;
      assets: number;
      liabilities: number;
      monthlyChange: number;
    }> = [];

    // Calcular patrimônio líquido dos últimos 6 meses (ACUMULADO até cada mês)
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const month = targetDate.getMonth();
      const year = targetDate.getFullYear();

      // Fim do mês para snapshot acumulado
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
      const isCurrentMonth = i === 0;

      let totalAssets = 0;
      let liabilities = 0;

      if (isCurrentMonth) {
        // Mês atual: usar dados reais do CashierReport
        totalAssets = currentReport?.totalAssets || 0;
        liabilities = currentReport?.totalLiabilities || 0;
      } else {
        // Meses anteriores: calcular baseado em histórico acumulado

        // 1. Saldo bancário inicial (configurado manualmente em cada mês)
        const initialBalances = initialBalanceService
          .getInitialBalances()
          .filter(b => new Date(b.date) <= endOfMonth)
          .reduce((acc, b) => acc + (b.value || 0), 0);

        // 2. Contas a receber pendentes (emitidas até o mês, não recebidas)
        const salesReceivables = cache.receivables
          .filter(r => new Date(r.issueDate) <= endOfMonth)
          .reduce((acc, r) => acc + Math.max(0, (r.originalValue || 0) - (r.paidValue || 0)), 0);

        // 3. Mercadorias em trânsito (carregadas até o mês, ainda em trânsito)
        const merchandiseValue = cache.loadings
          .filter(l => {
            const loadDate = new Date(l.date);
            return loadDate <= endOfMonth && ['loaded', 'in_transit'].includes(l.status);
          })
          .reduce((acc, l) => acc + (l.totalPurchaseValue || 0), 0);

        // 4. Caixa acumulado: Receitas recebidas - Despesas pagas (até o mês)
        const revenuesReceived = cache.sales
          .filter(s => s.transactions && s.transactions.length > 0)
          .flatMap(s => s.transactions || [])
          .filter(t => {
            if (t.type !== 'receipt') return false;
            const txDate = new Date(t.date);
            return txDate <= endOfMonth;
          })
          .reduce((acc, t) => acc + t.value, 0);

        const expensesPaid = cache.purchases
          .filter(p => p.transactions && p.transactions.length > 0)
          .flatMap(p => p.transactions || [])
          .filter(t => {
            if (t.type !== 'payment' && t.type !== 'advance') return false;
            const txDate = new Date(t.date);
            return txDate <= endOfMonth;
          })
          .reduce((acc, t) => acc + t.value, 0);

        const cashFlow = revenuesReceived - expensesPaid;

        // 5. Patrimônio (ativos fixos) acumulado até o mês
        const fixedAssetsValue = assetService.getAll()
          .filter(a => {
            const acquisitionDate = new Date(a.acquisitionDate);
            if (acquisitionDate > endOfMonth) return false;

            if (a.status === 'active') return true;
            if (a.status === 'sold') {
              if (!a.saleDate) return false;
              return new Date(a.saleDate) > endOfMonth;
            }
            if (a.status === 'write_off') {
              if (!a.writeOffDate) return false;
              return new Date(a.writeOffDate) > endOfMonth;
            }
            return false;
          })
          .reduce((acc, a) => acc + (a.acquisitionValue || 0), 0);

        totalAssets = initialBalances + cashFlow + salesReceivables + merchandiseValue + fixedAssetsValue;

        // PASSIVOS ACUMULADOS até o fim do mês
        liabilities = cache.payables
          .filter(p => new Date(p.issueDate) <= endOfMonth)
          .reduce((acc, p) => acc + Math.max(0, (p.originalValue || 0) - (p.paidValue || 0)), 0);
      }

      const netWorth = totalAssets - liabilities;

      history.push({
        name: monthNames[month],
        netWorth,
        assets: totalAssets,
        liabilities,
        monthlyChange: 0 // Será calculado depois
      });
    }

    // Calcular variação mês a mês
    for (let i = 1; i < history.length; i++) {
      const current = history[i].netWorth;
      const previous = history[i - 1].netWorth;
      history[i].monthlyChange = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : 0;
    }

    // Calcular crescimento total (último mês vs primeiro mês)
    const firstMonth = history[0]?.netWorth || 0;
    const lastMonth = history[history.length - 1]?.netWorth || 0;
    const growthPercent = firstMonth !== 0 ? ((lastMonth - firstMonth) / Math.abs(firstMonth)) * 100 : 0;

    return {
      history,
      growthPercent
    };
  }
};
