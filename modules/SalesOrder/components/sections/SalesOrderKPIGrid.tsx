import React from 'react';
import { formatCurrency } from '../../../../utils/formatters';

interface SalesOrderKPIGridProps {
  transitValue: number;
  totalRevenueRealized: number;
  totalReceived: number;
  totalPending: number;
}

const SalesOrderKPIGrid: React.FC<SalesOrderKPIGridProps> = ({ 
  transitValue, 
  totalRevenueRealized, 
  totalReceived, 
  totalPending 
}) => {
  const isPendingWarning = totalPending > 0.1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {/* Carga em Trânsito */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group hover:border-blue-200 transition-all">
        <span className="text-[9px] font-black text-slate-400 uppercase block mb-1 not-italic">Carga em Trânsito</span>
        <p className="text-xl font-black text-blue-600 tracking-tighter">
          {formatCurrency(transitValue)}
        </p>
      </div>

      {/* Faturado Realizado */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group hover:border-emerald-200 transition-all">
        <span className="text-[9px] font-black text-emerald-600 uppercase block mb-1 not-italic">Faturado Realizado</span>
        <p className="text-xl font-black text-slate-900 tracking-tighter">
          {formatCurrency(totalRevenueRealized)}
        </p>
      </div>

      {/* Total Recebido */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group hover:border-emerald-300 transition-all">
        <span className="text-[9px] font-black text-emerald-600 uppercase block mb-1 not-italic">Total Recebido</span>
        <p className="text-xl font-black text-emerald-700 tracking-tighter">
          {formatCurrency(totalReceived)}
        </p>
      </div>

      {/* Saldo Pendente */}
      <div className={`p-5 rounded-2xl border-2 shadow-lg transition-all transform hover:scale-[1.02] duration-300 ${
        isPendingWarning 
          ? 'bg-amber-50 border-amber-300 scale-100' 
          : 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-200'
      }`}>
        <span className={`text-[9px] font-black uppercase block mb-1 not-italic ${
          isPendingWarning ? 'text-amber-700' : 'text-emerald-100'
        }`}>
          Saldo Pendente
        </span>
        <p className="text-xl font-black tracking-tighter">
          {formatCurrency(totalPending)}
        </p>
      </div>
    </div>
  );
};

export default SalesOrderKPIGrid;
