
import React from 'react';
import { Truck, ChevronRight, Wallet } from 'lucide-react';

interface Props {
  name: string;
  count: number;
  totalAdvances: number;
  totalBalance: number;
  globalCredit?: number; // Novo: Crédito global do financeiro
  onClick: () => void;
}

const CarrierCard: React.FC<Props> = ({ name, count, totalAdvances, totalBalance, globalCredit = 0, onClick }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  return (
    <div 
      onClick={onClick}
      className="group cursor-pointer bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-primary-300 transition-all overflow-hidden flex flex-col h-full"
    >
      {/* Header */}
      <div className="p-5 border-b border-slate-100 bg-slate-50 group-hover:bg-blue-50/30 transition-colors">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
            <div className="bg-white p-1.5 rounded-md border border-slate-200 text-slate-500">
              <Truck size={18} />
            </div>
            <span className="line-clamp-1">{name}</span>
          </div>
          <div className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
            {count} Cargas
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-500">Adiant. Frete (Já abatido)</span>
          <span className="font-medium text-slate-700">{currency(totalAdvances)}</span>
        </div>
        
        {/* Exibe saldo global se houver */}
        {globalCredit > 0 && (
            <div className="flex justify-between items-center bg-emerald-50 px-2 py-1.5 rounded border border-emerald-100">
              <span className="text-[10px] font-bold uppercase text-emerald-700 flex items-center gap-1">
                 <Wallet size={12} /> Crédito em Conta
              </span>
              <span className="font-bold text-emerald-700 text-sm">{currency(globalCredit)}</span>
            </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
          <span className="text-sm font-bold text-slate-700">Saldo Devedor</span>
          <span className="text-xl font-bold text-amber-600">{currency(totalBalance)}</span>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-sm font-medium text-primary-600 flex items-center justify-between group-hover:bg-primary-50 transition-colors">
        Gerenciar Pagamentos
        <ChevronRight size={16} />
      </div>
    </div>
  );
};

export default CarrierCard;
