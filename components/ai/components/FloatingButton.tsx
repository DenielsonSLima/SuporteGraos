
import React from 'react';
import { BrainCircuit, ChevronLeft } from 'lucide-react';

interface Props {
  onClick: () => void;
}

const FloatingButton: React.FC<Props> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed right-0 bottom-10 z-[9998] group flex flex-col items-center justify-center gap-3 py-6 px-1.5 bg-slate-900 border-y border-l border-emerald-500/30 rounded-l-2xl shadow-[0_0_20px_rgba(0,0,0,0.4)] hover:pr-3 hover:bg-slate-800 transition-all duration-300 w-9 hover:w-12 overflow-hidden"
      title="Abrir Assistente Daitec"
    >
      <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-emerald-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
      <BrainCircuit size={20} className="text-emerald-400 group-hover:scale-110 transition-transform" />
      <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-white transition-colors whitespace-nowrap">
        Daitec AI
      </span>
      <ChevronLeft size={14} className="text-emerald-500/50 group-hover:-translate-x-1 transition-transform" />
    </button>
  );
};

export default FloatingButton;
