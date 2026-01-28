import React, { useState } from 'react';
import { X, AlertTriangle, Calendar, FileText, Save } from 'lucide-react';
import { Asset } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  onConfirm: (data: { date: string; reason: string; notes: string }) => void;
}

const AssetWriteOffModal: React.FC<Props> = ({ isOpen, onClose, asset, onConfirm }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    reason: 'Avaria / Quebra Total',
    notes: ''
  });

  if (!isOpen) return null;

  const reasons = [
    'Avaria / Quebra Total',
    'Obsolescência / Sucateamento',
    'Furto / Roubo',
    'Sinistro / Acidente',
    'Doação',
    'Outros'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(formData);
  };

  const inputClass = 'w-full border-2 border-slate-200 rounded-xl bg-white p-3 text-slate-900 font-bold focus:border-rose-500 outline-none transition-all';
  const labelClass = 'block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest ml-1';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-rose-100">
        <div className="bg-rose-600 px-6 py-5 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} />
            <h3 className="font-black uppercase tracking-tighter italic text-lg">Dar Baixa no Bem</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 text-rose-800 text-xs font-medium leading-relaxed">
            <strong>Atenção:</strong> Ao dar baixa, o item <strong>{asset.name}</strong> deixará de constar no inventário de ativos da empresa. Esta ação não gera recebíveis.
          </div>

          <div>
            <label className={labelClass}>Motivo da Baixa</label>
            <select 
              className={inputClass}
              value={formData.reason}
              onChange={e => setFormData({...formData, reason: e.target.value})}
            >
              {reasons.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Data da Ocorrência</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="date" required 
                className={`${inputClass} pl-10`}
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Laudo / Observações</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-slate-300" size={18} />
              <textarea 
                rows={3} 
                className={`${inputClass} pl-10 h-24 resize-none text-xs`}
                placeholder="Descreva o ocorrido ou anexe número de boletim de ocorrência..."
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-3 text-slate-400 font-black uppercase text-[10px] hover:bg-slate-50 rounded-xl">Cancelar</button>
            <button type="submit" className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-2">
              <Save size={16} /> Confirmar Baixa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetWriteOffModal;