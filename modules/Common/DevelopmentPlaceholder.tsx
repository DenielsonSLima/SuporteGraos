import React from 'react';
import { Construction, Timer, ArrowRight } from 'lucide-react';

interface Props {
  moduleName: string;
}

const DevelopmentPlaceholder: React.FC<Props> = ({ moduleName }) => {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <div className="mb-6 rounded-full bg-primary-100 p-6">
        <Construction className="h-16 w-16 text-primary-600" />
      </div>
      <h2 className="mb-2 text-3xl font-bold text-slate-800">{moduleName}</h2>
      <div className="mb-6 flex items-center justify-center gap-2 rounded-full bg-amber-100 px-4 py-1 text-sm font-medium text-amber-800">
        <Timer size={16} />
        <span>Módulo em Desenvolvimento</span>
      </div>
      <p className="max-w-md text-slate-500">
        Estamos trabalhando duro para trazer as melhores funcionalidades para o módulo de 
        <strong className="text-slate-700"> {moduleName}</strong>. 
        Aguarde novidades nas próximas atualizações do sistema.
      </p>
      
      <div className="mt-8 flex gap-4">
        <button className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition-hover hover:bg-slate-50 hover:text-primary-600">
          Ver Roadmap
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default DevelopmentPlaceholder;