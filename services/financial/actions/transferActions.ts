/**
 * ============================================================================
 * TRANSFER ACTIONS — Operações de Transferência Bancária
 * ============================================================================
 * 
 * Extraído de financialActionService.ts para isolar a lógica de transferências.
 * Responsabilidades:
 *   - Mapear entre TransferRecord (UI) ↔ Transfer (Service)
 *   - CRUD de transferências com logging
 */

import { TransferRecord } from '../../../modules/Financial/types';
import { transfersService, Transfer } from '../transfersService';
import { logService } from '../../logService';
import { authService } from '../../authService';
import { invalidateFinancialCache } from '../../financialCache';
import { invalidateDashboardCache } from '../../dashboardCache';
import { formatMoney as formatCurrency } from '../../../utils/formatters';
import { paymentOrchestrator } from '../paymentOrchestrator';

const resolveAccountId = paymentOrchestrator.resolveAccountId;
const resolveAccountLabel = paymentOrchestrator.resolveAccountLabel;

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

export const mapTransferToRecord = (transfer: Transfer): TransferRecord => ({
  id: transfer.id,
  date: transfer.transferDate,
  originAccount: resolveAccountLabel(transfer.fromAccountId),
  destinationAccount: resolveAccountLabel(transfer.toAccountId),
  value: transfer.amount,
  description: transfer.description,
  user: authService.getCurrentUser()?.name || 'Sistema'
});

export const mapRecordToTransfer = (record: TransferRecord): Transfer => ({
  id: record.id,
  transferDate: record.date,
  fromAccountId: resolveAccountId(record.originAccount),
  toAccountId: resolveAccountId(record.destinationAccount),
  amount: record.value,
  description: record.description,
  notes: undefined
});

export const getTransfers = (): TransferRecord[] =>
  transfersService.getAll().map(mapTransferToRecord);

export const addTransfer = async (transfer: TransferRecord): Promise<void> => {
  const mapped = mapRecordToTransfer(transfer);
  await transfersService.add(mapped);
  const { userId, userName } = getLogInfo();
  logService.addLog({
    userId, userName, action: 'create', module: 'Financeiro',
    description: `Transferência bancária: ${transfer.originAccount} -> ${transfer.destinationAccount} no valor de ${formatCurrency(transfer.value)}`
  });
  invalidateFinancialCache();
  invalidateDashboardCache();
};

export const updateTransfer = async (transfer: TransferRecord): Promise<void> => {
  const mapped = mapRecordToTransfer(transfer);
  await transfersService.update(mapped);
  const { userId, userName } = getLogInfo();
  logService.addLog({
    userId, userName, action: 'update', module: 'Financeiro',
    description: `Editou transferência ID ${transfer.id}`
  });
  invalidateFinancialCache();
  invalidateDashboardCache();
};

export const deleteTransfer = async (id: string): Promise<void> => {
  const t = transfersService.getById(id);
  await transfersService.delete(id);
  const { userId, userName } = getLogInfo();
  const origin = t ? resolveAccountLabel(t.fromAccountId) : 'Conta origem';
  const dest = t ? resolveAccountLabel(t.toAccountId) : 'Conta destino';
  logService.addLog({
    userId, userName, action: 'delete', module: 'Financeiro',
    description: `Excluiu transferência de ${formatCurrency(t?.amount || 0)} entre ${origin} e ${dest}`
  });
  invalidateFinancialCache();
  invalidateDashboardCache();
};

export const importTransfers = async (transfers: TransferRecord[]): Promise<void> => {
  if (transfers && transfers.length > 0) {
    const items = transfers.map(mapRecordToTransfer);
    await (transfersService as any).importData(items);
  }
};
