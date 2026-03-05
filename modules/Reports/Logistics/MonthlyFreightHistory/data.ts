import { loadingService } from '../../../../services/loadingService';
import { financialIntegrationService } from '../../../../services/financialIntegrationService';

export function getFreightCarrierOptions() {
  return Array.from(
    new Set(
      financialIntegrationService
        .getPayables()
        .filter((record) => record.subType === 'freight')
        .map((record) => record.entityName)
        .filter(Boolean)
    )
  );
}

export async function fetchMonthlyFreightHistoryData(filters: {
  startDate?: string;
  endDate?: string;
  carrierName?: string;
}) {
  return loadingService.fetchMonthlyFreightHistory(filters);
}