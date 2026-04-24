import { supabase } from '../../../services/supabase';
import { authService } from '../../../services/authService';

type DashboardPayload = {
  operational: {
    ordersLast30Days: number;
    volumeSc: number;
    volumeTon: number;
    avgPurchasePrice: number;
    avgSalesPrice: number;
    avgFreightPriceTon: number;
    avgCostPerSc: number;
    avgProfitPerSc: number;
  };
  financialPending: {
    receivables: any[];
    tradePayables: any[];
    expenses: any[];
  };
  financial: any;
  chart: any[];
  netWorth: {
    history: any[];
    growthPercent: number;
  };
};

const EMPTY_DASHBOARD_PAYLOAD: DashboardPayload = {
  operational: {
    ordersLast30Days: 0,
    volumeSc: 0,
    volumeTon: 0,
    avgPurchasePrice: 0,
    avgSalesPrice: 0,
    avgFreightPriceTon: 0,
    avgCostPerSc: 0,
    avgProfitPerSc: 0,
  },
  financialPending: {
    receivables: [],
    tradePayables: [],
    expenses: [],
  },
  financial: {
    totalBankBalance: 0,
    totalLiabilities: 0,
    pendingSalesReceipts: 0,
    merchandiseInTransitValue: 0,
    totalAssets: 0,
    netWorth: 0,
  },
  chart: [],
  netWorth: {
    history: [],
    growthPercent: 0,
  },
};

async function getCompanyId(): Promise<string> {
  const currentUserCompanyId = authService.getCurrentUser()?.companyId;
  if (currentUserCompanyId) return currentUserCompanyId;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('app_users')
    .select('company_id')
    .eq('auth_user_id', user.id)
    .single();

  if (error || !data?.company_id) {
    throw new Error('Empresa não encontrada para o usuário logado.');
  }

  return data.company_id as string;
}

let pendingDashboardPromise: Promise<DashboardPayload> | null = null;
const DASHBOARD_RPC_TIMEOUT_MS = 6000;

const isAccessFetchError = (error: unknown): boolean => {
  const message = String((error as any)?.message || '').toLowerCase();
  return (
    message.includes('access control checks') ||
    message.includes('failed to fetch') ||
    message.includes('load failed') ||
    message.includes('networkerror') ||
    message.includes('network error')
  );
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Timeout ao carregar dashboard')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

async function fetchDashboardPayload(): Promise<DashboardPayload> {
  let companyId: string;
  try {
    companyId = await getCompanyId();
  } catch {
    return EMPTY_DASHBOARD_PAYLOAD;
  }

  let data: any;
  let error: any;

  try {
    const rpcResponse = await withTimeout<{ data: any; error: any }>(
      supabase.rpc('rpc_dashboard_data', {
        p_company_id: companyId,
      }) as unknown as Promise<{ data: any; error: any }>,
      DASHBOARD_RPC_TIMEOUT_MS,
    );

    data = rpcResponse.data;
    error = rpcResponse.error;
  } catch (rpcError) {
    if (isAccessFetchError(rpcError)) {
      return EMPTY_DASHBOARD_PAYLOAD;
    }
    throw rpcError;
  }

  if (error) {
    if (isAccessFetchError(error)) {
      return EMPTY_DASHBOARD_PAYLOAD;
    }
    throw error;
  }

  return {
    operational: data?.operational ?? EMPTY_DASHBOARD_PAYLOAD.operational,
    financialPending: data?.financialPending ?? EMPTY_DASHBOARD_PAYLOAD.financialPending,
    financial: {
      ...(data?.financial ?? EMPTY_DASHBOARD_PAYLOAD.financial),
      // netWorth vem pré-calculado do RPC (server-side)
      netWorth: data?.financial?.netWorth ?? 0,
    },
    chart: data?.chart ?? EMPTY_DASHBOARD_PAYLOAD.chart,
    netWorth: data?.netWorth ?? EMPTY_DASHBOARD_PAYLOAD.netWorth,
  };
}

export const dashboardService = {
  getEmptyDashboardData: (): DashboardPayload => EMPTY_DASHBOARD_PAYLOAD,

  getDashboardData: async (): Promise<DashboardPayload> => {
    if (pendingDashboardPromise) {
      return pendingDashboardPromise;
    }

    pendingDashboardPromise = fetchDashboardPayload()
      .finally(() => {
        pendingDashboardPromise = null;
      });

    return pendingDashboardPromise;
  },

  getOperationalKPIs: async () => {
    const payload = await fetchDashboardPayload();
    return payload.operational;
  },

  getFinancialPending: async () => {
    const payload = await fetchDashboardPayload();
    return payload.financialPending;
  },

  getChartData: async () => {
    const payload = await fetchDashboardPayload();
    return payload.chart;
  },

  getNetWorthHistory: async () => {
    const payload = await fetchDashboardPayload();
    return payload.netWorth;
  },

  invalidateCache: () => {
    // TanStack Query controla o cache — noop mantido por compatibilidade
  },

  prefetchDashboardData: () => {
    if (pendingDashboardPromise) return;
    void dashboardService.getDashboardData().catch(() => {
      // noop
    });
  },

  // REALTIME — Singleton channel (otimiza WebSocket)
  subscribeRealtime: (() => {
    const listeners = new Set<() => void>();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    return (onAnyChange: () => void): (() => void) => {
      listeners.add(onAnyChange);

      if (!channel) {
        const invalidate = () => {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            pendingDashboardPromise = null; // Libera o "bloqueio" de promessa pendente
            listeners.forEach((fn) => fn());
          }, 100); // ⚡ Reduzido para 100ms para resposta quase instantânea
        };

        channel = supabase
          .channel('realtime:dashboard_singleton')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_entries' }, invalidate)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_transactions' }, invalidate)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, invalidate)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_loadings' }, invalidate)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_purchase_orders' }, invalidate)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_sales_orders' }, invalidate)
          .subscribe();
      }

      return () => {
        listeners.delete(onAnyChange);
        if (listeners.size === 0 && channel) {
          supabase.removeChannel(channel);
          channel = null;
          if (debounceTimer) clearTimeout(debounceTimer);
        }
      };
    };
  })(),
};
