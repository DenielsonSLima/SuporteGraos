
import React, { useState } from 'react';
import { User, TrendingDown, Eye, Edit2, CheckCircle2, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react';
import { Shareholder } from '../../../../services/shareholderService';

interface Props {
  shareholder: Shareholder;
  onWithdraw: (s: Shareholder) => void;
  onViewHistory: (s: Shareholder) => void;
  onConfigureRecurrence: (s: Shareholder) => void; // NOVO
}

const ShareholderCard: React.FC<Props> = ({ shareholder, onWithdraw, onViewHistory, onConfigureRecurrence }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  
  const hasRecurrence = shareholder.financial.recurrence?.active;
  const recurrenceAmount = shareholder.financial.recurrence?.amount || 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col group">
      
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-slate-600 shadow-sm">
            <User size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => onViewHistory(shareholder)}>
              {shareholder.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-1.5 rounded">{shareholder.cpf}</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => onViewHistory(shareholder)}
          className="text-slate-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition-colors"
          title="Ver Detalhes"
        >
          <Eye size={20} />
        </button>
      </div>

      {/* Financial Info */}
      <div className="p-5 space-y-6 flex-1">
        
        {/* Balance */}
        <div className="text-center cursor-pointer hover:scale-105 transition-transform" onClick={() => onViewHistory(shareholder)}>
          <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Saldo Acumulado</p>
          <div className={`text-3xl font-black tracking-tighter ${shareholder.financial.currentBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {currency(shareholder.financial.currentBalance)}
          </div>
        </div>

        {/* Recurrence Config */}
        <div 
            onClick={() => onConfigureRecurrence(shareholder)}
            className={`flex justify-between items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                hasRecurrence 
                ? 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100' 
                : 'bg-white border-slate-100 hover:border-slate-300'
            }`}
        >
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${hasRecurrence ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                <RefreshCw size={14} className={hasRecurrence ? "" : "opacity-50"} />
            </div>
            <div>
                <span className={`block text-[10px] font-black uppercase tracking-wide ${hasRecurrence ? 'text-indigo-800' : 'text-slate-400'}`}>
                    Crédito Automático
                </span>
                <span className={`text-xs font-bold ${hasRecurrence ? 'text-indigo-600' : 'text-slate-300'}`}>
                    {hasRecurrence ? currency(recurrenceAmount) : 'Não configurado'}
                </span>
            </div>
          </div>
          <Edit2 size={12} className="text-slate-300 group-hover:text-indigo-400" />
        </div>
      </div>

      {/* Footer Action */}
      <div className="p-4 border-t border-slate-100 bg-white flex gap-2">
        <button 
          onClick={() => onWithdraw(shareholder)}
          className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-rose-100 text-rose-700 py-2.5 rounded-xl font-bold hover:bg-rose-50 hover:border-rose-200 transition-colors shadow-sm text-xs uppercase tracking-widest"
        >
          <TrendingDown size={14} />
          Pagar (Baixa)
        </button>
      </div>

    </div>
  );
};

export default ShareholderCard;
