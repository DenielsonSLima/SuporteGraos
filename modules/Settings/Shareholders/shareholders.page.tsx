
import React, { useState, useMemo } from 'react';
import type { Shareholder } from '../../../services/shareholderService';
import { useToast } from '../../../contexts/ToastContext';
import { useShareholders, useAddShareholder, useUpdateShareholder, useDeleteShareholder } from '../../../hooks/useShareholders';
import ShareholderForm from './components/ShareholderForm';
import ShareholderList from './components/ShareholderList';

interface Props {
  onBack: () => void;
}

const ShareholdersSettings: React.FC<Props> = ({ onBack }) => {
  const { addToast } = useToast();
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [shareholderToDelete, setShareholderToDelete] = useState<Shareholder | null>(null);

  const { data: shareholders = [], isLoading } = useShareholders();
  const addShareholderMutation = useAddShareholder();
  const updateShareholderMutation = useUpdateShareholder();
  const deleteShareholderMutation = useDeleteShareholder();

  const filteredAndSortedShareholders = useMemo(() => {
    return shareholders
      .filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.cpf.includes(searchTerm)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [shareholders, searchTerm]);

  const initialFormState = {
    name: '',
    cpf: '',
    email: '',
    phone: '',
    address: {
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      zip: ''
    }
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleAddNew = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setViewMode('form');
  };

  const handleEdit = (shareholder: Shareholder) => {
    setFormData(shareholder);
    setEditingId(shareholder.id);
    setViewMode('form');
  };

  const confirmDelete = async () => {
    if (!shareholderToDelete) return;
    try {
      await deleteShareholderMutation.mutateAsync(shareholderToDelete.id);
      addToast('success', 'Sócio Removido', 'O cadastro foi excluído permanentemente.');
    } catch (err: any) {
      addToast('error', 'Erro ao Excluir', err.message ?? 'Não foi possível excluir o sócio.');
    } finally {
      setShareholderToDelete(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateShareholderMutation.mutateAsync({ ...formData, id: editingId } as Shareholder);
        addToast('success', 'Cadastro Atualizado', 'Os dados do sócio foram salvos.');
      } else {
        await addShareholderMutation.mutateAsync(formData as Omit<Shareholder, 'id'>);
        addToast('success', 'Sócio Cadastrado', 'O novo sócio foi adicionado com sucesso.');
      }
      setViewMode('list');
    } catch (err: any) {
      addToast('error', 'Erro ao Salvar', err.message ?? 'Não foi possível salvar o sócio.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cpf') {
      formattedValue = value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: formattedValue
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: formattedValue }));
    }
  };

  if (viewMode === 'form') {
    return (
      <ShareholderForm
        formData={formData}
        editingId={editingId}
        onChange={handleInputChange}
        onSave={handleSave}
        onCancel={() => setViewMode('list')}
      />
    );
  }

  return (
    <ShareholderList
      shareholders={filteredAndSortedShareholders}
      isLoading={isLoading}
      searchTerm={searchTerm}
      shareholderToDelete={shareholderToDelete}
      onSearchChange={setSearchTerm}
      onAddNew={handleAddNew}
      onEdit={handleEdit}
      onDeleteRequest={setShareholderToDelete}
      onDeleteConfirm={confirmDelete}
      onDeleteCancel={() => setShareholderToDelete(null)}
      onBack={onBack}
    />
  );
};

export default ShareholdersSettings;
