
import React, { useState, useEffect, useMemo } from 'react';
import { Coins, Plus } from 'lucide-react';
import SettingsSubPage from '../components/SettingsSubPage';
import InitialBalanceList from './components/InitialBalanceList';
import InitialBalanceForm from './components/InitialBalanceForm';
import ActionConfirmationModal from '../../../components/ui/ActionConfirmationModal';
import { financialService, InitialBalanceRecord } from '../../../services/financialService';
import { BankAccount } from '../../Financial/types';
import { useToast } from '../../../contexts/ToastContext';

const uuidv4 = () => {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    const hex = Array.from(bytes, toHex).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  // Fallback (não criptográfico, apenas para ambientes sem crypto)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

interface Props {
  onBack: () => void;
}

const InitialBalanceSettings: React.FC<Props> = ({ onBack }) => {
  const { addToast } = useToast();
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [balances, setBalances] = useState<InitialBalanceRecord[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  const loadData = () => {
    setBalances(financialService.getInitialBalances());
    setAccounts(financialService.getBankAccounts().filter(acc => acc.active !== false));
  };

  useEffect(() => {
    const unsubscribeBalances = financialService.subscribeInitialBalances(items => setBalances(items));
    const unsubscribeAccounts = financialService.subscribeBankAccounts(items => 
      setAccounts(items.filter(acc => acc.active !== false))
    );
    
    loadData();
    
    return () => {
      if (typeof unsubscribeBalances === 'function') unsubscribeBalances();
      if (typeof unsubscribeAccounts === 'function') unsubscribeAccounts();
    };
  }, []);

  // Filtra apenas contas que AINDA NÃO possuem saldo inicial definido
  const availableAccounts = useMemo(() => {
    return accounts.filter(acc => !balances.some(b => b.accountId === acc.id));
  }, [accounts, balances]);

  const handleSave = async (data: { accountId: string; date: string; value: number }) => {
    const account = accounts.find(a => a.id === data.accountId);
    if (!account) return;

    try {
      await financialService.addInitialBalance({
        id: uuidv4(),
        accountId: data.accountId,
        accountName: account.bankName,
        date: data.date,
        value: data.value
      });

      loadData();
      addToast('success', 'Saldo Salvo', 'Ponto de partida registrado com sucesso.');
      setViewMode('list');
    } catch (error: any) {
      addToast('error', 'Erro ao Salvar', error.message);
    }
  };

  const confirmDelete = async () => {
    if (idToDelete) {
      await financialService.removeInitialBalance(idToDelete);
      loadData();
      addToast('success', 'Registro Removido');
      setIdToDelete(null);
    }
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
