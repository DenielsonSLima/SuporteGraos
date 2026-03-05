# Skill: Otimização de Performance — Supabase Realtime + TanStack Query

**Autor:** GitHub Copilot  
**Data:** Junho 2025  
**Contexto:** ERP Grãos — React + TypeScript + Supabase + TanStack Query v5

---

## Resumo

Este documento registra os padrões e boas práticas de performance aplicados ao sistema ERP Grãos.  
O objetivo principal foi **reduzir a quantidade de canais WebSocket simultâneos** (de ~35-40 para ~20-25), **eliminar refetch storms** causados por invalidações em cascata, e **padronizar o gerenciamento de cache** com TanStack Query.

---

## 1. Consolidação de Subscrições Realtime

### Problema
Vários hooks abriam suas próprias subscrições Supabase Realtime para a **mesma tabela**, causando canais WebSocket duplicados.

**Exemplo ruim:**
```ts
// ❌ Cada hook abre sua própria subscrição
function usePayables() {
  useEffect(() => {
    const channel = supabase.channel('realtime:payables:hook-payables')...
  }, []);
}

function useEntriesByStatus() {
  useEffect(() => {
    const channel = supabase.channel('realtime:payables:hook-status')...
  }, []);
}

function useEntryById() {
  useEffect(() => {
    const channel = supabase.channel('realtime:payables:hook-byid')...
  }, []);
}
```

### Solução
Criar **um único hook interno compartilhado** de subscrição e reutilizá-lo nos hooks que precisam.

**Exemplo correto:**
```ts
// ✅ Hook interno compartilhado
function usePayablesRealtimeInvalidation() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel('realtime:financial_entries:payables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_entries' }, () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_PAYABLES });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TOTALS });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);
}

// Hooks públicos chamam o compartilhado
function usePayables() {
  usePayablesRealtimeInvalidation();
  return useQuery({ queryKey: QUERY_KEYS.FINANCIAL_PAYABLES, ... });
}

function useEntriesByStatus() {
  // ✅ Sem subscrição própria — recebe invalidação via staleTime
  return useQuery({ queryKey: [...QUERY_KEYS.FINANCIAL_PAYABLES, 'by-status', status], ... });
}
```

### Regra
- **1 tabela = 1 subscrição Realtime** (no máximo 1 por hook principal).
- Hooks auxiliares (filtros, byId, totais) NÃO abrem suas próprias subscrições.
- Hooks auxiliares devem usar queryKeys derivados do principal para receber invalidação automática.

---

## 2. Eliminação de Invalidações em Cascata

### Problema
Hooks de operações financeiras (transferências, empréstimos, adiantamentos) invalidavam queries de **outros módulos**. Isso criava uma reação em cadeia ao estilo dominó, gerando refetchs simultâneos massivos.

**Exemplo ruim:**
```ts
// ❌ Cascata — uma mutação de transferência invalida 4 módulos
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSFERS });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS });          // cascata
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TRANSACTIONS }); // cascata
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TOTAL_BALANCE });     // cascata
  window.dispatchEvent(new Event('transfer-updated'));                        // cascata via evento
}
```

### Solução
Cada mutação invalida **apenas seu próprio queryKey**. Os outros módulos recebem atualização naturalmente via suas **próprias subscrições Realtime** ou quando o staleTime expirar.

**Exemplo correto:**
```ts
// ✅ Sem cascata — cada módulo cuida de si
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSFERS });
}
```

### Regra
- `onSuccess` de uma mutação invalida **apenas** as queries do próprio módulo.
- Outros módulos são atualizados por suas **próprias subscrições Realtime** ou por staleTime.
- **Nunca** usar `window.dispatchEvent` para propagação de dados entre módulos.

---

## 3. Padronização de staleTime com Tiers

### Problema
Cada hook definia seu próprio `staleTime` com constantes locais (`STALE_TIME_ENTRIES = 30000`, `STALE_2_MIN = 120000`), gerando inconsistência e dificultando manutenção.

### Solução
Usar os **tiers centralizados** já definidos em `hooks/queryKeys.ts`:

```ts
export const STALE_TIMES = {
  VOLATILE:  30 * 1000,   // 30s — dados que mudam frequentemente (dashboard)
  DYNAMIC:   60 * 1000,   // 1min — entries, transactions (padrão)
  MODERATE:  2 * 60 * 1000, // 2min — bank accounts, locations
  REFERENCE: 5 * 60 * 1000, // 5min — categories, classifications
  STABLE:    10 * 60 * 1000, // 10min — company, shareholders
  STATIC:    30 * 60 * 1000, // 30min — dados que raramente mudam
};
```

### Regra para escolher o tier

| Tipo de dado | Tier | Exemplo |
|---|---|---|
| Dados de dashboard, saldos em tempo real | `VOLATILE` (30s) | Dashboard stats |
| Lançamentos financeiros, transações | `DYNAMIC` (1min) | Payables, receivables, transactions |
| Contas bancárias, locais | `MODERATE` (2min) | Bank accounts, locations |
| Categorias, classificações | `REFERENCE` (5min) | Expense categories, classifications |
| Dados da empresa, sócios | `STABLE` (10min) | Company info, shareholders |
| Configurações estáticas | `STATIC` (30min) | Static settings |

---

## 4. Migração de Cache Paralelo para TanStack Query

### Problema
O Dashboard mantinha um sistema de cache próprio (`DashboardCache`) com TTL de 30s, fora do TanStack Query. Isso significava:
- Dados duplicados na memória
- Sem deduplicação de requests
- Sem suporte a Suspense, Error Boundaries, ou devtools

### Solução
Migrar para `useQuery` do TanStack Query:

```ts
// ✅ Dashboard usando TanStack Query
const DASHBOARD_KEY = ['dashboard', 'stats'];

const { data, isLoading, error } = useQuery({
  queryKey: DASHBOARD_KEY,
  queryFn: async () => { /* fetch dashboard data */ },
  staleTime: STALE_TIMES.VOLATILE,
  placeholderData: keepPreviousData,  // evita flash de loading
  initialData: cachedInitialData,     // hidratação instantânea
});
```

### Regra
- **Nunca** criar sistemas de cache paralelos (Map, localStorage, variáveis globais).
- **Sempre** usar `useQuery`/`useMutation` do TanStack Query como fonte única de cache.
- Usar `placeholderData: keepPreviousData` para evitar flash de loading em refetchs.

---

## 5. Throttle e Debounce no Resilience Hook  

### Problema
O hook `useRealtimeResilience` invalidava **todas** as queries ativas a cada:
- Tab switch (visibilitychange)
- Reconexão de rede (online event)

Isso causava picos de refetch massivos ao alternar entre abas.

### Solução
Adicionar **throttle de 30s** + **debounce de 1s**:

```ts
// ✅ Throttle para visibilitychange
const MIN_VISIBILITY_RESYNC_INTERVAL = 30_000; // 30s
const lastVisibilityResyncRef = useRef(0);

const handleVisibilityChange = useCallback(() => {
  if (document.visibilityState !== 'visible') return;
  const now = Date.now();
  if (now - lastVisibilityResyncRef.current < MIN_VISIBILITY_RESYNC_INTERVAL) return;
  lastVisibilityResyncRef.current = now;
  
  // debounce 1s
  clearTimeout(debounceRef.current);
  debounceRef.current = window.setTimeout(() => {
    queryClient.invalidateQueries({ type: 'active' });
  }, 1000);
}, [queryClient]);
```

### Regra
- Eventos de browser (`visibilitychange`, `online`) devem ter **throttle mínimo de 30s**.
- Invalidações globais devem ter **debounce de pelo menos 1s**.
- Usar `type: 'active'` em vez de invalidar tudo (invalida apenas queries montadas no momento).

---

## 6. KeepPreviousData para Listas Paginadas

### Problema
Ao trocar de página ou filtro, a tela piscava com um loading spinner antes de mostrar os novos dados.

### Solução
```ts
// ✅ keepPreviousData
const { data } = useQuery({
  queryKey: ['purchase-orders', filters],
  queryFn: () => fetchOrders(filters),
  placeholderData: keepPreviousData,  // mantém dados anteriores durante refetch
});
```

### Regra
- Sempre usar `placeholderData: keepPreviousData` em queries de listas com filtros ou paginação.
- Isso garante transições suaves sem flash de loading.

---

## 7. Checklist de Performance para Novos Hooks

Ao criar um novo hook com TanStack Query + Supabase Realtime:

- [ ] **staleTime** usa um tier de `STALE_TIMES` (nunca hardcoded)
- [ ] **Subscrição Realtime** existe apenas no hook principal (não em auxiliares)
- [ ] **onSuccess** de mutações invalida apenas o próprio queryKey (sem cascata)
- [ ] **keepPreviousData** está habilitado se a query tem filtros/paginação
- [ ] **Sem cache paralelo** (sem Map, localStorage, variáveis globais para dados)
- [ ] **Sem window events** para propagação de dados entre módulos
- [ ] **QueryKey derivado** do principal para hooks auxiliares (ex: `[...QUERY_KEYS.BASE, 'filter', value]`)

---

## 8. Métricas de Impacto (Referência)

| Métrica | Antes | Depois |
|---|---|---|
| Canais Realtime simultâneos | ~35-40 | ~20-25 |
| Subscrições duplicadas | ~12-15 | 0 |
| Cascatas de invalidação | ~8 módulos | 0 |
| staleTime inconsistente | 6+ constantes locais | 6 tiers centralizados |
| Caches paralelos | 1 (Dashboard) | 0 |
| Throttle em tab-switch | Nenhum | 30s + debounce 1s |

---

## 9. Arquivos Modificados (Referência)

| Arquivo | O que foi feito |
|---|---|
| `modules/Dashboard/Dashboard.tsx` | Migrado de cache paralelo para TanStack Query |
| `hooks/useCashier.ts` | Reduzido de 6 para 2 subscrições |
| `hooks/useLoadings.ts` | Hook compartilhado `useLoadingsRealtimeInvalidation()` |
| `hooks/useRealtimeResilience.ts` | Throttle 30s + debounce 1s |
| `hooks/useFinancialEntries.ts` | Subscrições removidas de hooks auxiliares |
| `hooks/useFinancialTransactions.ts` | Hook compartilhado `useTransactionsRealtimeInvalidation()` |
| `hooks/useAccounts.ts` | Subscrição duplicada removida de `useTotalBalance` |
| `hooks/useCompany.ts` | Canal duplicado removido (service já tem) |
| `hooks/useWatermark.ts` | Canal duplicado removido |
| `hooks/useBankAccounts.ts` | staleTime padronizado → `MODERATE` |
| `hooks/useExpenseCategories.ts` | staleTime padronizado → `REFERENCE` |
| `hooks/useAdvances.ts` | Cascatas removidas |
| `hooks/useTransfers.ts` | Cascatas + window events removidos |
| `hooks/useLoans.ts` | Cascata removida |
| `hooks/useAdminExpenses.ts` | Cascata removida |
| `hooks/useShareholderOperations.ts` | Cascatas removidas |
| `hooks/usePurchaseOrders.ts` | `keepPreviousData` adicionado |
