
import React, { useState, useEffect } from 'react';
import { X, Save, Car, Box } from 'lucide-react';
import { Asset, AssetType } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: any) => void;
  initialData?: Asset | null;
}

const AssetForm: React.FC<Props> = ({ isOpen, onClose, onSave, initialData }) => {
  const [displayValue, setDisplayValue] = useState('');
  const [numericValue, setNumericValue] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    type: 'vehicle' as AssetType,
    acquisitionDate: new Date().toISOString().split('T')[0],
    identifier: '',
    description: ''
  });

  const formatBRL = (val: number) => {
    const normalized = Math.abs(val) < 0.01 ? 0 : val;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(normalized);
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ name: initialData.name, type: initialData.type, acquisitionDate: initialData.acquisitionDate, identifier: initialData.identifier || '', description: initialData.description || '' });
        setNumericValue(initialData.acquisitionValue);
        setDisplayValue(formatBRL(initialData.acquisitionValue));
      } else {
        setNumericValue(0);
        setDisplayValue('');
        setFormData({ name: '', type: 'vehicle', acquisitionDate: new Date().toISOString().split('T')[0], identifier: '', description: '' });
      }
    }
  }, [isOpen, initialData]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = Number(raw) / 100;
    setNumericValue(num);
    setDisplayValue(formatBRL(num));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="bg-slate-900 px-8 py-6 text-white flex justify-between items-center">
          <h3 className="font-black uppercase tracking-tighter italic text-lg">{initialData ? 'Editar Bem' : 'Novo Ativo'}</h3>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full"><X size={28} /></button>
        </div>

        <form 
          onSubmit={(e) => { 
            e.preventDefault(); 
            if (numericValue > 0) {
              const payload = initialData 
                ? { ...initialData, ...formData, acquisitionValue: numericValue }
                : { ...formData, acquisitionValue: numericValue };
              onSave(payload);
            }
          }} 
          className="p-8 space-y-5"
        >
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Nome / Modelo</label>
            <input type="text" required className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-900 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Tipo de Ativo</label>
            <select required className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-900 outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as AssetType})}>
              <option value="vehicle">Veículo</option>
              <option value="machine">Máquina Agrícola</option>
              <option value="property">Imóvel</option>
              <option value="equipment">Equipamento</option>
              <option value="other">Outro</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Valor de Aquisição</label>
                <input type="text" required className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 font-black text-blue-700 outline-none" value={displayValue} onChange={handleValueChange} placeholder="R$ 0,00" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Data Compra</label>
                <input type="date" required className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-900 outline-none" value={formData.acquisitionDate} onChange={e => setFormData({...formData, acquisitionDate: e.target.value})} />
              </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Identificador (Placa, Chassi, Matrícula)</label>
            <input type="text" className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-900 outline-none uppercase" value={formData.identifier} onChange={e => setFormData({...formData, identifier: e.target.value})} placeholder="Ex: ABC-1234" />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">Descrição / Observações (Opcional)</label>
            <textarea rows={3} className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-900 outline-none resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Detalhes adicionais..."></textarea>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-8 py-4 border-2 border-slate-200 rounded-2xl text-slate-500 font-black uppercase text-xs">Cancelar</button>
            <button type="submit" className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl">Confirmar Cadastro</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetForm;
