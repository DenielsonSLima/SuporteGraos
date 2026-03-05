import { useCallback } from 'react';
import { reportAuditService } from '../../../services/reportAuditService';
import { loadingService } from '../../../services/loadingService';

export function useReportScreenOperations() {
  const subscribeLogisticsRefresh = useCallback((onRefresh: () => void) => {
    return loadingService.subscribe(() => {
      onRefresh();
    });
  }, []);

  const logReportAccess = useCallback((
    reportId: string,
    reportTitle: string,
    filters: any,
    rowsCount: number,
  ) => {
    return reportAuditService.logReportAccess(reportId, reportTitle, filters, rowsCount);
  }, []);

  return {
    subscribeLogisticsRefresh,
    logReportAccess,
  };
}