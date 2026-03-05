import React, { useState, useMemo } from 'react';
import { useAccountsForSettings, useCreateAccount, useSoftDeleteAccount, useUpdateAccount } from '../../../hooks/useAccounts';
import type { Account } from '../../../hooks/useAccounts';
import { useToast } from '../../../contexts/ToastContext';
import BankAccountForm from './components/BankAccountForm';
import BankAccountList from './components/BankAccountList';

interface Props { onBack: () => void; }

const initialForm = { account_name: '', owner: '', agency: '', account_number: '', is_active: true, allows_negative: false };

const BankAccountsSettings: React.FC<Props> = ({ onBack }) => {
  const { addToast } = useToast();

  const { data: accounts = [], isLoading } = useAccountsForSettings();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const softDeleteAccount = useSoftDeleteAccount();

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(initialForm);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  const handleAddNew = () => { setFormData(initialForm); setEditingId(null); setViewMode('form'); };
  const handleEdit = (a: Account) => {
    setFormData({
      account_name: a.account_name,
      owner: a.owner ?? '',
      agency: a.agency ?? '',
      account_number: a.account_number ?? '',
      is_active: a.is_active !== false,
      allows_negative: a.allows_negative ?? false,
    });
    setEditingId(a.id);
    setViewMode('form');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateAccount.mutateAsync({ id: editingId, data: {
          account_name: formData.account_name,
          owner: formData.owner || undefined,
          agency: formData.agency || undefined,
          account_number: formData.account_number || undefined,
          is_active: formData.is_active,
          allows_negative: formData.allows_negative,
        } });
        addToast('success', 'Atualizado', 'Conta bancária salva com sucesso.');
      } else {
        await createAccount.mutateAsync({
          account_type: 'bank',
          account_name: formData.account_name,
          owner: formData.owner || undefined,
          agency: formData.agency || undefined,
          account_number: formData.account_number || undefined,
          is_active: formData.is_active,
          allows_negative: formData.allows_negative,
        });
        addToast('success', 'Cadastrado', 'Conta bancária criada com sucesso.');
      }
      setViewMode('list');
    } catch (err: any) {
      addToast('error', 'Erro ao Salvar', err.message ?? 'Não foi possível salvar.');
    }
  };

  const handleToggleStatus = async (a: Account) => {
    const newActive = a.is_active === false;
    try {
      await updateAccount.mutateAsync({ id: a.id, data: { is_active: newActive } });
      addToast(newActive ? 'success' : 'info', newActive ? 'Conta Ativada' : 'Conta Desativada', `A conta ${a.account_name} foi ${newActive ? 'ativada' : 'desativada'}.`);
    } catch (err: any) {
      addToast('error', 'Erro', err.message);
    }
  };

  const confirmDelete = async () => {
    if (!accountToDelete) return;
    try {
      await softDeleteAccount.mutateAsync(accountToDelete.id);
      addToast('success', 'Conta Removida', 'A conta bancária foi desativada.');
    } catch (err: any) {
      addToast('error', 'Erro ao Excluir', err.message);
    }
    setAccountToDelete(null);
  };

  const filtered = useMemo(() =>
    accounts
      .filter(a => a.account_name.toLowerCase().includes(searchTerm.toLowerCase()) || (a.owner ?? '').toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.account_name.localeCompare(b.account_name)),
    [accounts, searchTerm]
  );

  if (viewMode === 'form') {
    return (
      <BankAccountForm
        formData={formData}
        editingId={editingId}
        onChange={setFormData}
        onSave={handleSave}
        onCancel={() => setViewMode('list')}
      />
    );
  }

  return (
    <BankAccountList
      accounts={filtered}
      isLoading={isLoading}
      searchTerm={searchTerm}
      accountToDelete={accountToDelete}
      onSearchChange={setSearchTerm}
      onAddNew={handleAddNew}
      onEdit={handleEdit}
      onToggleStatus={handleToggleStatus}
      onDeleteRequest={setAccountToDelete}
      onDeleteConfirm={confirmDelete}
      onDeleteCancel={() => setAccountToDelete(null)}
      onBack={onBack}
    />
  );
};

export default BankAccountsSettings;
