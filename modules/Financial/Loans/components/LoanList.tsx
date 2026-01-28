
import React from 'react';
import { Landmark, ChevronRight } from 'lucide-react';
import { LoanRecord } from '../../types';

interface Props {
  loans: LoanRecord[];
  onSelect: (id: string) => void;
}

const LoanList: React.FC<Props> = ({ loans, onSelect }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (loans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
        <Landmark size={48} className="text-slate-300 mb-4" />
        <p className="font-black text-slate-400 uppercase tracking-widest">Nenhum contrato encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {loans.map(loan => (
        <div 
          key={loan.id} 
          onClick={() => onSelect(loan.id)}
          className="group cursor-pointer bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all relative overflow-hidden"
        >
           <div className="flex justify-between items-start mb-6">
              <div className={`p-3 rounded-2xl ${loan.type === 'taken' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  <Landmark size={24} />
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${loan.status === 'active' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {loan.status === 'active' ? 'Ativo' : 'Liquidado'}
              </span>
           </div>
           
           <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic line-clamp-1">{loan.entityName}</h3>
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Início: {new Date(loan.contractDate).toLocaleDateString()}</p>

           <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-end">
              <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Saldo Atual</span>
                  <p className={`text-2xl font-black tracking-tighter ${loan.type === 'taken' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {currency(loan.remainingValue)}
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

export default LoanList;
