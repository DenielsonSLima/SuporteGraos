
import React, { useState } from 'react';
import { X, Save, Calendar, FileText, User } from 'lucide-react';
import { OrderNote } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Omit<OrderNote, 'id'>) => void;
  consultantName: string;
}

const NoteModal: React.FC<Props> = ({ isOpen, onClose, onSave, consultantName }) => {
  const [text, setText] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    onSave({
      date,
      text,
      author: consultantName
    });
    setText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <FileText size={20} className="text-blue-400" />
            Nova Anotação
          </h3>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-1">Data</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="date" 
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-bold"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-1">Responsável</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  disabled
                  value={consultantName}
                  className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 text-sm font-bold"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-1">Conteúdo da Nota</label>
            <textarea 
              rows={5}
              required
              value={text}
              onChange={e => setText(e.target.value)}
              className="w-full p-4 border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-medium leading-relaxed"
              placeholder="Digite aqui as observações importantes sobre este pedido..."
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-bold text-sm transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg flex items-center gap-2 text-sm transition-all active:scale-95"
            >
              <Save size={18} />
              Salvar Nota
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoteModal;
