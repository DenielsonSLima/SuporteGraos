import { useMemo } from 'react';
import { useUpdateAsset } from '../../../hooks/useAssets';
import { useStandaloneRecords, useProcessPayment, useAddAdminExpense, useDeleteStandaloneRecord } from '../../../hooks/useFinancialActions';
import { FinancialRecord } from '../../Financial/types';

export function useAssetDetailsOperations(assetId: string) {
  const { data: standaloneRecords = [] } = useStandaloneRecords();
  const updateAssetMutation = useUpdateAsset();
  const processPaymentMutation = useProcessPayment();
  const addAdminExpenseMutation = useAddAdminExpense();
  const deleteStandaloneRecordMutation = useDeleteStandaloneRecord();

  const financialHistory = useMemo(() => {
    return standaloneRecords
      .filter((record: FinancialRecord) => record.assetId === assetId)
      .sort((a: FinancialRecord, b: FinancialRecord) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [assetId, standaloneRecords]);

  const confirmPayment = async (recordId: string, data: any) => {
    await processPaymentMutation.mutateAsync({ recordId, data });
  };

  const updateRecord = async (updated: any) => {
    await addAdminExpenseMutation.mutateAsync(updated);
  };

  const deleteRecord = async (id: string) => {
    await deleteStandaloneRecordMutation.mutateAsync(id);
  };

  const updateAsset = async (asset: any) => {
    await updateAssetMutation.mutateAsync(asset);
  };

  return {
    financialHistory,
    confirmPayment,
    updateRecord,
    deleteRecord,
    updateAsset,
  };
}