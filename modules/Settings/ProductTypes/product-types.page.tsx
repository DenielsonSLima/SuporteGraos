
import React, { useState } from 'react';
import { Package, Plus, Pencil, Trash2, Save, Search, Lock, ShieldCheck, Wheat, X } from 'lucide-react';
import SettingsSubPage from '../components/SettingsSubPage';
import type { ProductType } from '../../../services/classificationService';
import { useToast } from '../../../contexts/ToastContext';
import { useProductTypes, useAddProductType, useUpdateProductType, useDeleteProductType } from '../../../hooks/useClassifications';
import { SkeletonCards } from '../../../components/ui/SkeletonCards';

interface Props {
  onBack: () => void;
}

const ProductTypesSettings: React.FC<Props> = ({ onBack }) => {
  const { addToast } = useToast();
  const { data: types = [], isLoading } = useProductTypes();
  const addProductType = useAddProductType();
  const updateProductType = useUpdateProductType();
  const deleteProductType = useDeleteProductType();

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ name: '', description: '' });

  const handleAddNew = () => { setFormData({ name: '', description: '' }); setEditingId(null); setViewMode('form'); };
  const handleEdit = (type: ProductType) => { setFormData({ name: type.name, description: type.description }); setEditingId(type.id); setViewMode('form'); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const existing = types.find(t => t.id === editingId);
        if (existing) {
          await updateProductType.mutateAsync({
            ...existing,
            name:        existing.isSystem ? existing.name : formData.name,
            description: formData.description,
          });
        }
        addToast('success', 'Atualizado', 'Tipo de produto atualizado com sucesso.');
      } else {
        await addProductType.mutateAsync(formData);
        addToast('success', 'Cadastrado', 'Novo tipo de produto adicionado.');
      }
      setViewMode('list');
    } catch (err: any) {
      addToast('error', 'Erro ao Salvar', err.message ?? 'Não foi possível salvar.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProductType.mutateAsync(id);
      addToast('success', 'Excluído', 'Tipo de produto removido.');
    } catch (err: any) {
      addToast('error', 'Erro', err.message);
    }
  };

  const filteredTypes = types.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (viewMode === 'form') {
    return (
      <SettingsSubPage title={editingId ? "Editar Produto" : "Novo Produto"} description="Defina os tipos de grãos comercializados." icon={Package} color="bg-yellow-500" onBack={() => setViewMode('list')}>
        <form onSubmit={handleSave} className="max-w-xl space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome da Mercadoria</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-bold text-slate-900 focus:border-yellow-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Descrição</label>
              <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-medium text-slate-900 focus:border-yellow-500 outline-none transition-all" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setViewMode('list')} className="px-8 py-3 rounded-xl border-2 border-slate-100 text-slate-400 font-black uppercase text-xs">Cancelar</button>
            <button type="submit" className="px-10 py-3 rounded-xl bg-slate-900 text-white font-black uppercase text-xs shadow-xl active:scale-95 flex items-center gap-2"><Save size={18}/> Salvar</button>
          </div>
        </form>
      </SettingsSubPage>
    );
  }

  return (
    <SettingsSubPage title="Produtos" description="Cadastro de tipos de grãos para estoque e contratos." icon={Package} color="bg-yellow-500" onBack={onBack}>
      <div className="mb-6 flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-100 bg-white text-sm font-bold text-slate-900 focus:border-yellow-500 outline-none" />
        </div>
        <button onClick={handleAddNew} className="flex items-center gap-2 bg-yellow-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase shadow-lg active:scale-95 transition-all"><Plus size={18}/> Novo</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <SkeletonCards count={6} cols={3} />
        ) : filteredTypes.length === 0 ? (
          <p className="col-span-3 py-10 text-center text-slate-500">Nenhum tipo de produto encontrado.</p>
        ) : filteredTypes.map(t => (
            <div key={t.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-yellow-400 transition-all">
                <div>
                   <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl"><Wheat size={24}/></div>
                      {t.isSystem && <span className="text-[8px] font-black uppercase bg-slate-100 px-2 py-1 rounded text-slate-400">Sistema</span>}
                   </div>
                   <h3 className="font-black text-slate-800 uppercase tracking-tighter italic text-lg">{t.name}</h3>
                   <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">{t.description}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                   <button onClick={() => handleEdit(t)} className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-lg"><Pencil size={16}/></button>
                   {!t.isSystem && <button onClick={() => handleDelete(t.id)} className="p-2 bg-slate-50 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 size={16}/></button>}
                </div>
            </div>
        ))}
      </div>
    </SettingsSubPage>
  );
};

export default ProductTypesSettings;
