
import React, { useState, useMemo } from 'react';
import type { ExpenseCategory, ExpenseSubtype } from '../../../services/expenseCategoryService';
import { useToast } from '../../../contexts/ToastContext';
import { useExpenseCategories, useAddExpenseCategory, useUpdateExpenseCategory, useDeleteExpenseCategory, useToggleExpenseCategoryStatus, useAddExpenseSubcategory, useUpdateExpenseSubcategory, useDeleteExpenseSubcategory, useToggleExpenseSubcategoryStatus } from '../../../hooks/useExpenseCategories';
import ExpenseTypeForm from './components/ExpenseTypeForm';
import ExpenseCategoryGrid from './components/ExpenseCategoryGrid';

interface Props {
  onBack: () => void;
}

const ExpenseTypesSettings: React.FC<Props> = ({ onBack }) => {
  const { addToast } = useToast();
  const { data: categories = [], isLoading } = useExpenseCategories();
  const addCategory = useAddExpenseCategory();
  const updateCategory = useUpdateExpenseCategory();
  const deleteCategory = useDeleteExpenseCategory();
  const toggleCategoryStatus = useToggleExpenseCategoryStatus();
  const addSubcategory = useAddExpenseSubcategory();
  const updateSubcategory = useUpdateExpenseSubcategory();
  const deleteSubcategoryMutation = useDeleteExpenseSubcategory();
  const toggleSubcategoryStatus = useToggleExpenseSubcategoryStatus();

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [subtypeToDelete, setSubtypeToDelete] = useState<{ cat: ExpenseCategory; sub: ExpenseSubtype } | null>(null);
  const [categoryToDeleteId, setCategoryToDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ categoryId: '', newCategoryName: '', subtypeName: '' });
  const [saving, setSaving] = useState(false);

  const handleAddNew = (preSelectedCategoryId?: string) => {
    setFormData({ categoryId: preSelectedCategoryId || '', newCategoryName: '', subtypeName: '' });
    setViewMode('form');
  };

  const confirmDeleteSubtype = async () => {
    if (!subtypeToDelete) return;
    try {
      await deleteSubcategoryMutation.mutateAsync(subtypeToDelete.sub.id);
      addToast('success', 'Item Removido');
    } catch (error: any) {
      addToast('error', 'Erro ao Excluir', error.message || 'Falha ao remover item.');
    }
    setSubtypeToDelete(null);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDeleteId) return;
    try {
      await deleteCategory.mutateAsync(categoryToDeleteId);
      addToast('success', 'Categoria Removida');
    } catch (error: any) {
      addToast('error', 'Erro ao Excluir', error.message);
    }
    setCategoryToDeleteId(null);
  };

  const handleEditSubtype = async (sub: ExpenseSubtype) => {
    const newName = window.prompt('Novo nome para o item:', sub.name);
    if (newName && newName.trim() !== sub.name) {
      try {
        await updateSubcategory.mutateAsync({ subcategoryId: sub.id, name: newName.trim().toUpperCase() });
        addToast('success', 'Item atualizado');
      } catch (err: any) {
        addToast('error', 'Erro ao atualizar', err.message);
      }
    }
  };

  const handleToggleSubtypeStatus = async (sub: ExpenseSubtype) => {
    try {
      await toggleSubcategoryStatus.mutateAsync({ id: sub.id, active: sub.active ?? true });
      addToast('success', sub.active ? 'Item inativado' : 'Item ativado');
    } catch (err: any) {
      addToast('error', 'Erro ao alterar status', err.message);
    }
  };

  const handleEditCategory = async (cat: ExpenseCategory) => {
    const newName = window.prompt('Novo nome para a categoria:', cat.name);
    if (newName && newName.trim() !== cat.name) {
      try {
        await updateCategory.mutateAsync({ id: cat.id, input: { name: newName.trim().toUpperCase() } });
        addToast('success', 'Categoria atualizada');
      } catch (err: any) {
        addToast('error', 'Erro ao atualizar', err.message);
      }
    }
  };

  const handleToggleCategoryStatus = async (cat: ExpenseCategory) => {
    try {
      await toggleCategoryStatus.mutateAsync({ id: cat.id, active: cat.active ?? true });
      addToast('success', cat.active ? 'Categoria inativada' : 'Categoria ativada');
    } catch (err: any) {
      addToast('error', 'Erro ao alterar status', err.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId && !formData.newCategoryName) {
      addToast('warning', 'Dados Incompletos', 'Selecione uma categoria existente ou crie uma nova.');
      return;
    }
    if (!formData.subtypeName.trim()) {
      addToast('warning', 'Dados Incompletos', 'O nome do subtipo é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      if (formData.categoryId && formData.categoryId !== 'new') {
        await addSubcategory.mutateAsync({ categoryId: formData.categoryId, name: formData.subtypeName.trim() });
      } else if (formData.newCategoryName.trim()) {
        const newCat = await addCategory.mutateAsync({
          name: formData.newCategoryName.trim(),
          type: 'custom',
          color: 'bg-violet-50 text-violet-700 border-violet-200',
        });
        await addSubcategory.mutateAsync({ categoryId: newCat.id, name: formData.subtypeName.trim() });
      }
      setViewMode('list');
      addToast('success', 'Salvo com Sucesso');
    } catch (err: any) {
      addToast('error', 'Atenção', err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return categories.filter(cat => {
      const matchCategory = cat.name.toLowerCase().includes(search);
      const matchSubtype = (cat.subtypes || []).some(s => s.name.toLowerCase().includes(search));
      return matchCategory || matchSubtype;
    });
  }, [categories, searchTerm]);

  if (viewMode === 'form') {
    return (
      <ExpenseTypeForm
        formData={formData}
        categories={categories}
        saving={saving}
        onChange={setFormData}
        onSave={handleSave}
        onCancel={() => setViewMode('list')}
      />
    );
  }

  return (
    <ExpenseCategoryGrid
      categories={filteredCategories}
      isLoading={isLoading}
      searchTerm={searchTerm}
      subtypeToDelete={subtypeToDelete}
      categoryToDeleteId={categoryToDeleteId}
      onSearchChange={setSearchTerm}
      onAddNew={handleAddNew}
      onDeleteSubtypeRequest={(cat, sub) => setSubtypeToDelete({ cat, sub })}
      onDeleteSubtypeConfirm={confirmDeleteSubtype}
      onDeleteSubtypeCancel={() => setSubtypeToDelete(null)}
      onDeleteCategoryRequest={setCategoryToDeleteId}
      onDeleteCategoryConfirm={confirmDeleteCategory}
      onDeleteCategoryCancel={() => setCategoryToDeleteId(null)}
      onBack={onBack}
      onEditSubtype={handleEditSubtype}
      onToggleSubtypeStatus={handleToggleSubtypeStatus}
      onEditCategory={handleEditCategory}
      onToggleCategoryStatus={handleToggleCategoryStatus}
    />
  );
};

export default ExpenseTypesSettings;
