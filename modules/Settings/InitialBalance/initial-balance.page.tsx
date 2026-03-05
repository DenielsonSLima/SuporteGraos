import React, { useState, useMemo } from 'react';
import { Coins, Plus } from 'lucide-react';
import SettingsSubPage from '../components/SettingsSubPage';
import InitialBalanceList from './components/InitialBalanceList';
import InitialBalanceForm from './components/InitialBalanceForm';
import ActionConfirmationModal from '../../../components/ui/ActionConfirmationModal';
import { useToast } from '../../../contexts/ToastContext';
import { useBankAccounts } from '../../../hooks/useBankAccounts';
import { useAddInitialBalance, useDeleteInitialBalance, useInitialBalances } from '../../../hooks/useInitialBalances';

const uuidv4 = () => crypto.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

interface Props { onBack: () => void; }

const InitialBalanceSettings: React.FC<Props> = ({ onBack }) => {
  const { addToast } = useToast();
  const addInitialBalance = useAddInitialBalance();
  const deleteInitialBalance = useDeleteInitialBalance();

  const { data: balances = [] } = useInitialBalances();
  const { data: allAccounts = [] } = useBankAccounts();

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  // Apenas contas ativas que ainda não têm saldo inicial
  const availableAccounts = useMemo(() =>
    allAccounts.filter(a => a.active !== false && !balances.some(b => b.accountId === a.id)),
    [allAccounts, balances]
  );

  const handleSave = async (data: { accountId: string; date: string; value: number }) => {
    const account = allAccounts.find(a => a.id === data.accountId);
    if (!account) return;
    try {
      await addInitialBalance.mutateAsync({
        id:          uuidv4(),
        accountId:   data.accountId,
        accountName: account.bankName,
        date:        data.date,
        value:       data.value,
      });
      addToast('success', 'Saldo Salvo', 'Ponto de partida registrado com sucesso.');
      setViewMode('list');
    } catch (err: any) {
      addToast('error', 'Erro ao Salvar', err.message ?? 'Não foi possível salvar.');
    }
  };

  const confirmDelete = async () => {
    if (!idToDelete) return;
    await deleteInitialBalance.mutateAsync(idToDelete);
    addToast('success', 'Registro Removido');
    setIdToDelete(null);
  };

  return (
    <SettingsSubPage
      title="Saldo Inicial de Contas"
      description="Configuração de abertura de caixa por conta bancária ou cofre."
      icon={Coins}
      color="bg-amber-500"
      onBack={onBack}
    >
      <div className="space-y-6">
        {viewMode === 'list' && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl max-w-lg">
              <p className="text-xs text-amber-800 font-bold leading-relaxed uppercase italic">
                Os saldos de abertura são fundamentais para que a conciliação bancária do ERP reflita seu saldo real. Cada conta pode ter apenas um marco zero.
              </p>
            </div>
            {availableAccounts.length > 0 && (
              <button
                onClick={() => setViewMode('form')}
                className="flex items-center gap-2 rounded-2xl bg-amber-600 px-6 py-3.5 text-xs font-black uppercase text-white shadow-lg shadow-amber-200 hover:bg-amber-700 transition-all active:scale-95"
              >
                <Plus size={18} /> Configurar Novo Saldo
              </button>
            )}
          </div>
        )}

        {viewMode === 'list' ? (
          <InitialBalanceList balances={balances} onDelete={setIdToDelete} />
        ) : (
          <InitialBalanceForm
            accounts={availableAccounts}
            onSave={handleSave}
            onCancel={() => setViewMode('list')}
          />
        )}
      </div>

      <ActionConfirmationModal
        isOpen={!!idToDelete}
        onClose={() => setIdToDelete(null)}
        onConfirm={confirmDelete}
        title="Remover Saldo de Abertura?"
        description="Esta ação removerá o marco zero desta conta. O fluxo de caixa poderá ficar inconsistente."
        type="danger"
      />
    </SettingsSubPage>
  );
};

export default InitialBalanceSettings;
