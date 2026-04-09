
import { AdvanceTransaction, PartnerAdvanceSummary } from '../types';
import { purchaseService } from '../../../../services/purchaseService';
import { Persistence } from '../../../../services/persistence';
import { logService } from '../../../../services/logService';
import { authService } from '../../../../services/authService';
import { invalidateDashboardCache } from '../../../../services/dashboardCache';
import { invalidateFinancialCache } from '../../../../services/financialCache';

const manualDb = new Persistence<AdvanceTransaction>('manual_advances', [], { useStorage: false });

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

export const advanceService = {
  
  getAllTransactions: async (): Promise<AdvanceTransaction[]> => {
    const manual = manualDb.getAll();
    const purchaseAdvances: AdvanceTransaction[] = [];
    const orders = await purchaseService.loadFromSupabase();

    orders.forEach(order => {
      if (order.transactions) {
        order.transactions.filter((t: any) => t.type === 'advance').forEach((t: any) => {
          purchaseAdvances.push({
            id: `po-adv-${t.id}`,
            partnerId: order.partnerId,
            partnerName: order.partnerName,
            type: 'given',
            date: t.date,
            value: t.value,
            description: `Adiantamento Pedido ${order.number}`,
            status: 'active',
            accountId: t.accountId,
            accountName: t.accountName
          });
        });
      }
    });

    return [...manual, ...purchaseAdvances].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  },

  getManualTransactions: async () => manualDb.getAll(),

  getSummaries: async (): Promise<PartnerAdvanceSummary[]> => {
    const allTransactions = await advanceService.getAllTransactions();
    const map: Record<string, PartnerAdvanceSummary> = {};

    allTransactions.forEach(t => {
      if (!map[t.partnerId]) {
        map[t.partnerId] = {
          partnerId: t.partnerId,
          partnerName: t.partnerName,
          totalGiven: 0,
          totalTaken: 0,
          netBalance: 0,
          lastTransactionDate: t.date
        };
      }

      if (t.type === 'given') {
        map[t.partnerId].totalGiven += t.value;
      } else {
        map[t.partnerId].totalTaken += t.value;
      }

      if (new Date(t.date) > new Date(map[t.partnerId].lastTransactionDate)) {
        map[t.partnerId].lastTransactionDate = t.date;
      }
    });

    return Object.values(map).map(summary => ({
      ...summary,
      netBalance: summary.totalGiven - summary.totalTaken
    })).sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));
  },

  getTransactionsByPartner: async (partnerId: string) => {
    const all = await advanceService.getAllTransactions();
    return all
      .filter(t => t.partnerId === partnerId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  addTransaction: (transaction: Omit<AdvanceTransaction, 'id' | 'status'>) => {
    const newTx: AdvanceTransaction = {
      ...transaction,
      id: crypto.randomUUID(),
      status: 'active'
    };
    manualDb.add(newTx);
    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'create', module: 'Financeiro', description: `Registrou adiantamento manual para ${transaction.partnerName}` });
    invalidateFinancialCache();
    invalidateDashboardCache();
  },

  deleteTransaction: (id: string) => {
    const tx = manualDb.getById(id);
    manualDb.delete(id);
    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'delete', module: 'Financeiro', description: `Excluiu adiantamento de ${tx?.partnerName}` });
    invalidateFinancialCache();
    invalidateDashboardCache();
  },

  importData: (data: AdvanceTransaction[]) => {
    manualDb.setAll(data);
    invalidateFinancialCache();
    invalidateDashboardCache();
  }
};
