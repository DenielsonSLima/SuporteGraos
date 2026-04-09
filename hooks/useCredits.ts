import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import creditService from '../services/financial/creditService';
import type { FinancialRecord } from '../modules/Financial/types';
import { handleStandalonePayment } from '../services/financial/handlers/standaloneHandler';
import { supabase } from '../services/supabase';

export const useCredits = () => {
  return useQuery({
    queryKey: QUERY_KEYS.CREDITS,
    queryFn: async () => {
      // 1. Load credits from Supabase
      await creditService.loadFromSupabase();
      const credits = creditService.getCredits();
      
      if (credits.length === 0) return credits;

      // 2. Enrich with bank account info from financial_transactions
      const creditIds = credits.map(c => c.id);
      const { data: transactions } = await supabase
        .from('financial_transactions')
        .select('entry_id, account_id')
        .in('entry_id', creditIds);

      if (transactions && transactions.length > 0) {
        const accountMap = new Map<string, string>();
        transactions.forEach(t => {
          if (t.entry_id && t.account_id) {
            accountMap.set(t.entry_id, t.account_id);
          }
        });
        
        return credits.map(c => ({
          ...c,
          bankAccount: accountMap.get(c.id) || c.bankAccount || '',
        }));
      }

      return credits;
    },
    staleTime: STALE_TIMES.DYNAMIC,
  });
};

interface CreateCreditParams {
  description: string;
  amount: number;
  date: string;
  accountId: string;
  accountName: string;
}

export const useCreateCredit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateCreditParams) => {
      // 1. Create the base credit record
      const newRecord: FinancialRecord = {
        id: crypto.randomUUID(),
        description: params.description,
        entityName: 'Crédito Avulso',
        category: 'income',
        dueDate: params.date,
        issueDate: params.date,
        settlementDate: params.date,
        originalValue: params.amount,
        paidValue: params.amount, // Paid immediately
        status: 'paid', // Mark as paid so it goes into the active ledger
        subType: 'credit_income',
        bankAccount: params.accountId,
        notes: '',
        remainingValue: 0,
        discountValue: 0,
      };

      const credit = await creditService.create(newRecord);
      if (!credit) throw new Error('Falha ao criar crédito base');

      // 2. Register the financial transaction / receipt via Orchestrator standalone handler mechanism
      // This will ensure it affects the correct bank account and appears in history
      await handleStandalonePayment(
        credit.id,
        {
          date: params.date,
          amount: params.amount,
          discount: 0,
          accountId: params.accountId,
          accountName: params.accountName,
          partnerId: undefined, // No partner
          notes: ''
        },
        credit,
        creditService // pass the service so it can update if needed
      );

      return credit;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CREDITS }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TOTAL_BALANCE }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CASHIER_CURRENT }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_ENTRIES }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD })
      ]);
    },
  });
};

export const useUpdateCredit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { description: string; amount: number; date: string } }) => {
      const result = await creditService.update(id, {
        description: data.description,
        originalValue: data.amount,
        dueDate: data.date,
        issueDate: data.date,
      });
      if (!result) throw new Error('Falha ao atualizar crédito');
      return result;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CREDITS }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TOTAL_BALANCE }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CASHIER_CURRENT }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_ENTRIES }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD })
      ]);
    },
  });
};

export const useDeleteCredit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await creditService.remove(id);
      if (!result) throw new Error('Falha ao excluir crédito');
      return result;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CREDITS }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TOTAL_BALANCE }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CASHIER_CURRENT }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_ENTRIES }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD })
      ]);
    },
  });
};
