import React, { useState } from 'react';
import { Package, X, Save, Wheat, Loader2 } from 'lucide-react';
import { useAddProductType } from '../../../../hooks/useClassifications';
import { useToast } from '../../../../contexts/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (productName: string) => void;
}

const QuickProductModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { addToast } = useToast();
  const addProductType = useAddProductType();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSaving(true);
    try {
      await addProductType.mutateAsync(formData);
      addToast('success', 'Cadastrado', `Produto "${formData.name}" adicionado com sucesso.`);
      if (onSuccess) onSuccess(formData.name);
      setFormData({ name: '', description: '' });
      onClose();
    } catch (err: any) {
      addToast('error', 'Erro ao Salvar', err.message ?? 'Não foi possível salvar o produto.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500 rounded-xl text-white shadow-lg shadow-yellow-500/20">
              <Package size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight">Cadastro Rápido</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nova Mercadoria</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              Nome da Mercadoria
            </label>
            <div className="relative">
              <Wheat className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                autoFocus
                required 
                placeholder="Ex: Soja, Milho, Sorgo..."
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                className="w-full rounded-2xl border-2 border-slate-200 bg-white pl-12 pr-4 py-3 font-bold text-slate-900 focus:border-yellow-500 outline-none transition-all placeholder:text-slate-300" 
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              Descrição (Opcional)
            </label>
            <textarea 
              rows={2} 
              placeholder="Detalhes adicionais..."
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 font-medium text-slate-900 focus:border-yellow-500 outline-none transition-all placeholder:text-slate-300 resize-none" 
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isSaving}
              className="px-6 py-3 rounded-xl border-2 border-slate-100 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-70"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16}/>}
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickProductModal;
