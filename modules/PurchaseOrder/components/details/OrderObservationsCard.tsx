
import React from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { OrderNote } from '../../types';

interface Props {
  notes: OrderNote[];
  onAddNote: () => void;
}

const OrderObservationsCard: React.FC<Props> = ({ notes, onAddNote }) => {
  const dateStr = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col w-full">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-blue-500" />
          <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-700">Observações e Histórico de Notas</h3>
        </div>
        <button 
          onClick={onAddNote} 
          className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-1.5 text-[10px] font-black text-blue-700 hover:bg-blue-100 transition-all uppercase tracking-widest"
        >
          <Plus size={14} /> Nova Nota
        </button>
      </div>
      <div className="p-6">
        {(!notes || notes.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-6 opacity-30 italic">
            <p className="text-xs font-bold uppercase tracking-widest">Nenhuma observação registrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notes.map((note) => (
              <div key={note.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 relative shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[9px] font-black text-blue-600 uppercase">{dateStr(note.date)}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Autor: {note.author}</p>
                </div>
                <p className="text-slate-700 text-xs font-medium leading-relaxed italic">"{note.text}"</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderObservationsCard;
