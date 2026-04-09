import React from 'react';

interface Note {
  id: string;
  date: string;
  author: string;
  text: string;
}

interface Props {
  notes: Note[];
  onAddNote: () => void;
}

const SalesOrderNotesSection: React.FC<Props> = ({ notes = [], onAddNote }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col h-full">
      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4">Anotações da Venda</h3>
      <button 
        onClick={onAddNote}
        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/30 transition-all duration-300"
      >
        + Adicionar Observação
      </button>
      
      <div className="mt-6 space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
        {notes.length === 0 && (
          <div className="text-center py-10">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Nenhuma observação interna</p>
          </div>
        )}
        {notes.map(n => (
          <div key={n.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-slate-200 transition-all">
            <p className="font-black text-slate-400 text-[8px] uppercase mb-1 flex justify-between">
              <span>{new Date(n.date).toLocaleDateString()}</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">{n.author}</span>
            </p>
            <p className="text-xs font-medium text-slate-700 leading-relaxed italic">"{n.text}"</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalesOrderNotesSection;
