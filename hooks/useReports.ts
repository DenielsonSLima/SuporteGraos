// hooks/useReports.ts
// ============================================================================
// Hook TanStack Query para Reports (lazy loading com dynamic imports)
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { getReportById } from '../modules/Reports/registry';
import { ReportModule } from '../modules/Reports/types';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';

export function useReport(reportId: string | null) {
  return useQuery<ReportModule | undefined>({
    queryKey: [...QUERY_KEYS.REPORTS, reportId],
    queryFn: () => {
      if (!reportId) return undefined;
      return getReportById(reportId);
    },
    enabled: !!reportId,
    staleTime: STALE_TIMES.LONG, // Relatórios compilados não mudam
    gcTime: 30 * 60 * 1000, // 30min cache
  });
}
