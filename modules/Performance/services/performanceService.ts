import { purchaseService } from '../../../services/purchaseService';
import { salesService } from '../../../services/salesService';
import { loadingService } from '../../../services/loadingService';
import { financialIntegrationService } from '../../../services/financialIntegrationService';
import { shareholderService } from '../../../services/shareholderService';
import { financialService } from '../../../services/financialService';
import { PerformanceReport, MonthlyData, HarvestData, PriceTrendData, ExpenseCategorySummary, ExpenseSubtypeValue, OrderInsight } from '../types';

export const performanceService = {
  getReport: (monthsBack: number | null): PerformanceReport => {
    const today = new Date();
    let startDate: Date | null = null;

    if (monthsBack) {
      startDate = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);
    }

    const filterFn = (dateStr: string) => !startDate || new Date(dateStr) >= startDate;

    const allLoadings = loadingService.getAll();
    const loadings = allLoadings.filter(l => filterFn(l.date) && l.status !== 'canceled');
    const payables = financialIntegrationService.getPayables().filter(p => filterFn(p.issueDate));
    const shareholders = shareholderService.getAll();
    const expenseCats = financialService.getExpenseCategories();

    // --- TOTAIS ---
    const totalRevenue = loadings.reduce((acc, l) => acc + (l.totalSalesValue || 0), 0);
    const purchaseCostTotal = loadings.reduce((acc, l) => acc + (l.totalPurchaseValue || 0), 0);
    const freightCostTotal = loadings.reduce((acc, l) => acc + (l.totalFreightValue || 0), 0);

    // NOVO: Soma dos custos de deslocamento extra por redirecionamento
    const totalRedirectCosts = loadings.reduce((acc, l) => acc + (l.redirectDisplacementValue || 0), 0);

    const otherExpensesRecords = payables.filter(p => !['purchase_order', 'freight'].includes(p.subType || ''));
    let otherExpensesTotal = otherExpensesRecords.reduce((acc, p) => acc + p.originalValue, 0);

    shareholders.forEach(s => {
      s.financial.history.forEach(h => {
        if (h.type === 'debit' && filterFn(h.date)) otherExpensesTotal += h.value;
      });
    });

    const totalDebits = purchaseCostTotal + freightCostTotal + otherExpensesTotal;
    const balance = totalRevenue - totalDebits;

    // --- ESTRUTURA DE DESPESAS ---
    const findCategoryType = (subName: string) => expenseCats.find(c => c.subtypes.some(s => s.name === subName));
    const breakdownMap: Record<string, { total: number, items: Record<string, number> }> = {
      fixed: { total: 0, items: {} },
      variable: { total: 0, items: {} },
      administrative: { total: 0, items: {} }
    };

    otherExpensesRecords.forEach(r => {
      const parent = findCategoryType(r.category);
      const type = parent?.type || 'administrative';
      const categoryName = r.category;
      if (breakdownMap[type]) {
        breakdownMap[type].total += r.originalValue;
        breakdownMap[type].items[categoryName] = (breakdownMap[type].items[categoryName] || 0) + r.originalValue;
      }
    });

    shareholders.forEach(s => {
      s.financial.history.forEach(h => {
        if (h.type === 'debit' && filterFn(h.date)) {
          breakdownMap.administrative.total += h.value;
          breakdownMap.administrative.items['Retirada de Sócios'] = (breakdownMap.administrative.items['Retirada de Sócios'] || 0) + h.value;
        }
      });
    });

    const expenseBreakdown: ExpenseCategorySummary[] = [
      { label: 'Despesas Fixas', type: 'fixed' as const, total: breakdownMap.fixed.total, items: [] as ExpenseSubtypeValue[] },
      { label: 'Despesas Variáveis', type: 'variable' as const, total: breakdownMap.variable.total, items: [] as ExpenseSubtypeValue[] },
      { label: 'Custos Administrativos', type: 'administrative' as const, total: breakdownMap.administrative.total, items: [] as ExpenseSubtypeValue[] }
    ].map(group => {
      const typeKey = group.type;
      const items = Object.entries(breakdownMap[typeKey].items).map(([name, val]) => ({
        name,
        value: val,
        percentage: group.total > 0 ? (val / group.total) * 100 : 0
      })).sort((a, b) => b.value - a.value);
      return { ...group, items } as ExpenseCategorySummary;
    });

    // --- VOLUMES E MÉDIAS GERAIS ---
    const totalVolumeKg = loadings.reduce((acc, l) => acc + l.weightKg, 0);
    const totalVolumeTon = totalVolumeKg / 1000;
    const totalVolumeSc = totalVolumeKg / 60;

    const avgPurchasePrice = totalVolumeSc > 0 ? purchaseCostTotal / totalVolumeSc : 0;
    const avgSalesPrice = totalVolumeSc > 0 ? totalRevenue / totalVolumeSc : 0;
    const avgFreightPriceTon = totalVolumeTon > 0 ? freightCostTotal / totalVolumeTon : 0;

    const avgProfitPerSc = totalVolumeSc > 0 ? balance / totalVolumeSc : 0;
    const globalMarginPercent = totalRevenue > 0 ? (balance / totalRevenue) * 100 : 0;
    const avgTotalCostPerSc = totalVolumeSc > 0 ? totalDebits / totalVolumeSc : 0;

    const avgFreightCostSc = totalVolumeSc > 0 ? freightCostTotal / totalVolumeSc : 0;
    const avgPureOpCostSc = totalVolumeSc > 0 ? otherExpensesTotal / totalVolumeSc : 0;

    // Calcula o número real de meses distintos no dataset
    const allDates = [
      ...loadings.map(l => l.date),
      ...payables.map(p => p.issueDate)
    ];
    const distinctMonths = new Set(allDates.map(d => {
      const dt = new Date(d);
      return `${dt.getFullYear()}-${dt.getMonth()}`;
    }));
    const divisor = monthsBack || Math.max(distinctMonths.size, 1);
    const avgOtherExpensesMonthly = otherExpensesTotal / divisor;

    // --- DADOS MENSAIS ---
    const monthlyMap: Record<string, MonthlyData> = {};
    const priceTrendMap: Record<string, { pSum: number, pQty: number, sSum: number, sQty: number }> = {};
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    const monthsToIterate = monthsBack || 12;
    for (let i = 0; i < monthsToIterate; i++) {
      const d = new Date();
      d.setMonth(today.getMonth() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyMap[key] = {
        name: monthNames[d.getMonth()],
        fullDate: key,
        revenue: 0, freightCost: 0, purchaseCost: 0, otherExpenses: 0,
        netResult: 0, totalQuantitySc: 0,
        avgPurchaseCostSc: 0, avgFreightCostSc: 0, avgOtherCostSc: 0, avgTotalCostSc: 0
      };
      priceTrendMap[key] = { pSum: 0, pQty: 0, sSum: 0, sQty: 0 };
    }

    loadings.forEach(l => {
      const d = new Date(l.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthlyMap[key]) {
        monthlyMap[key].revenue += l.totalSalesValue;
        monthlyMap[key].purchaseCost += l.totalPurchaseValue;
        monthlyMap[key].freightCost += l.totalFreightValue;
        monthlyMap[key].totalQuantitySc += l.weightSc;
        priceTrendMap[key].pSum += l.totalPurchaseValue;
        priceTrendMap[key].pQty += l.weightSc;
        priceTrendMap[key].sSum += l.totalSalesValue;
        priceTrendMap[key].sQty += l.weightSc;
      }
    });

    otherExpensesRecords.forEach(p => {
      const d = new Date(p.issueDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthlyMap[key]) monthlyMap[key].otherExpenses += p.originalValue;
    });

    const sortFn = (a: any, b: any) => {
      const [yA, mA] = a.fullDate.split('-').map(Number);
      const [yB, mB] = b.fullDate.split('-').map(Number);
      return new Date(yA, mA).getTime() - new Date(yB, mB).getTime();
    };

    const monthlyHistory = Object.values(monthlyMap)
      .map(m => {
        const qty = m.totalQuantitySc >= 1 ? m.totalQuantitySc : 0;
        const safeQty = qty > 0 ? qty : 1; // Só usado como divisor
        return {
          ...m,
          netResult: m.revenue - (m.purchaseCost + m.freightCost + m.otherExpenses),
          avgPurchaseCostSc: qty > 0 ? m.purchaseCost / safeQty : 0,
          avgFreightCostSc: qty > 0 ? m.freightCost / safeQty : 0,
          avgOtherCostSc: qty > 0 ? m.otherExpenses / safeQty : 0,
          avgTotalCostSc: qty > 0 ? (m.purchaseCost + m.freightCost + m.otherExpenses) / safeQty : 0
        };
      })
      .sort(sortFn);

    const priceTrendHistory: PriceTrendData[] = Object.entries(priceTrendMap).map(([key, val]) => ({
      name: monthNames[parseInt(key.split('-')[1])],
      fullDate: key,
      avgPurchasePrice: val.pQty > 0 ? val.pSum / val.pQty : 0,
      avgSalesPrice: val.sQty > 0 ? val.sSum / val.sQty : 0
    })).sort(sortFn);

    const harvestMap: Record<string, HarvestData> = {};
    loadings.forEach(l => {
      const po = purchaseService.getById(l.purchaseOrderId);
      const uf = po?.partnerState || 'N/D';
      if (!harvestMap[uf]) {
        harvestMap[uf] = { uf, volumeTon: 0, volumeSc: 0, avgPurchasePrice: 0, avgSalesPrice: 0, avgFreightPrice: 0, totalPurchase: 0, totalSales: 0, totalFreight: 0 };
      }
      harvestMap[uf].volumeSc += l.weightSc;
      harvestMap[uf].volumeTon += l.weightTon;
      harvestMap[uf].totalPurchase += l.totalPurchaseValue;
      harvestMap[uf].totalSales += l.totalSalesValue;
      harvestMap[uf].totalFreight += l.totalFreightValue;
    });

    const harvests = Object.values(harvestMap).map(h => ({
      ...h,
      avgPurchasePrice: h.volumeSc > 0 ? h.totalPurchase / h.volumeSc : 0,
      avgSalesPrice: h.volumeSc > 0 ? h.totalSales / h.volumeSc : 0,
      avgFreightPrice: h.volumeTon > 0 ? h.totalFreight / h.volumeTon : 0
    })).sort((a, b) => b.volumeSc - a.volumeSc);

    // --- INSIGHTS ---
    const orderInsightsMap: Record<string, OrderInsight> = {};
    loadings.forEach(l => {
      if (!orderInsightsMap[l.purchaseOrderId]) {
        orderInsightsMap[l.purchaseOrderId] = {
          id: l.purchaseOrderId,
          orderNumber: l.purchaseOrderNumber,
          partnerName: l.supplierName,
          profit: 0,
          margin: 0
        };
      }
      const profit = l.totalSalesValue - (l.totalPurchaseValue + l.totalFreightValue);
      orderInsightsMap[l.purchaseOrderId].profit += profit;
    });

    const allOrderInsights = Object.values(orderInsightsMap).map(oi => {
      const orderLoadings = loadings.filter(l => l.purchaseOrderId === oi.id);
      const revenue = orderLoadings.reduce((acc, l) => acc + l.totalSalesValue, 0);
      return {
        ...oi,
        margin: revenue > 0 ? (oi.profit / revenue) * 100 : 0
      };
    });

    const topProfitOrders = [...allOrderInsights].sort((a, b) => b.profit - a.profit).slice(0, 3);
    const topLossOrders = [...allOrderInsights].sort((a, b) => a.profit - b.profit).slice(0, 3);

    const bestMonths = [...monthlyHistory].sort((a, b) => b.netResult - a.netResult).slice(0, 3);
    const worstMonths = [...monthlyHistory].sort((a, b) => a.netResult - b.netResult).slice(0, 3);

    return {
      totalRevenue, totalDebits, balance, avgProfitPerSc, globalMarginPercent,
      totalVolumeTon, totalVolumeSc, avgPurchasePrice, avgSalesPrice, avgFreightPriceTon, avgTotalCostPerSc,
      avgFreightCostSc, avgPureOpCostSc, totalRedirectCosts,
      avgOtherExpensesMonthly, monthlyHistory, priceTrendHistory, harvests, expenseBreakdown,
      topProfitOrders, topLossOrders, bestMonths, worstMonths
    };
  }
};