import React from 'react';
import { TrendingUp, ChevronRight } from 'lucide-react';
import { FinancialRecord } from '../../types';

interface Props {
  credits: FinancialRecord[];
  onSelect: (id: string) => void;
}

const CreditList: React.FC<Props> = ({ credits, onSelect }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Ordenar créditos alfabeticamente por descrição
  const sortedCredits = [...credits].sort((a, b) => 
    (a.description || '').localeCompare(b.description || '', 'pt-BR')
  );

  if (credits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
        <TrendingUp size={48} className="text-slate-300 mb-4" />
        <p className="font-black text-slate-400 uppercase tracking-widest">Nenhum crédito encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sortedCredits.map(credit => (
        <div 
          key={credit.id} 
          onClick={() => onSelect(credit.id)}
          className="group cursor-pointer bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-emerald-400 transition-all relative overflow-hidden"
        >
           <div className="flex justify-between items-start mb-6">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                  <TrendingUp size={24} />
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${credit.status === 'pending' || credit.status === 'partial' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {credit.status === 'paid' ? 'Recebido' : credit.status === 'pending' ? 'Pendente' : 'Parcial'}
              </span>
           </div>
           
           <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic line-clamp-1">{credit.description || 'Crédito'}</h3>
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Data: {new Date(credit.issueDate).toLocaleDateString()}</p>

           <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-end">
              <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Capital</span>
                  <p className="text-2xl font-black tracking-tighter text-emerald-600">
                      {currency(credit.originalValue || 0)}
                  </p>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-all">
                  <ChevronRight size={18} />
              </div>
           </div>
        </div>
      ))}
    </div>
  );
};

export default CreditList;
