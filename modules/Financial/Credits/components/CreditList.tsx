import React from 'react';
import { Landmark, ChevronRight } from 'lucide-react';
import { FinancialRecord } from '../../types';
import { creditService } from '../../../../services/financial/creditService';

interface Props {
  credits: FinancialRecord[];
  onSelect: (id: string) => void;
}

const CreditList: React.FC<Props> = ({ credits, onSelect }) => {
  const currency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'partial':
        return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' };
      case 'paid':
        return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' };
      default:
        return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100' };
    }
  };

  const getTypeLabel = (subType?: string) => {
    switch (subType) {
      case 'credit_income':
        return 'Crédito de Renda';
      case 'investment':
        return 'Investimento';
      default:
        return 'Crédito';
    }
  };

  // Ordenar créditos alfabeticamente
  const sortedCredits = [...credits].sort((a, b) =>
    a.entityName.localeCompare(b.entityName, 'pt-BR')
  );

  if (sortedCredits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
        <Landmark size={48} className="text-slate-300 mb-4" />
        <p className="font-black text-slate-400 uppercase tracking-widest">Nenhum crédito encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedCredits.map(credit => {
        const monthsElapsed = Math.max(1, Math.floor(
          (new Date().getTime() - new Date(credit.issueDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
        ));
        const earnings = creditService.calculateEarnings(credit.originalValue || 0, credit.paidValue || 0, monthsElapsed);
        const colors = getStatusColor(credit.status);

        return (
          <div
            key={credit.id}
            onClick={() => onSelect(credit.id)}
            className="group cursor-pointer bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-xl hover:border-emerald-400 transition-all relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tighter italic">
                  {credit.entityName}
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {getTypeLabel(credit.subType)} • Taxa: {credit.paidValue}% a.m.
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${colors.bg} ${colors.text} ${colors.border}`}>
                {credit.status === 'pending' || credit.status === 'partial' ? 'Ativo' : 'Encerrado'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Capital</span>
                <p className="text-lg font-black text-slate-900">
                  {currency(credit.originalValue || 0)}
                </p>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Rendimento</span>
                <p className="text-lg font-black text-emerald-600">
                  +{currency(earnings)}
                </p>
              </div>
              <div className="flex justify-end items-end">
                <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-all">
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium">
                Inicio: {new Date(credit.issueDate).toLocaleDateString('pt-BR')} • 
                Vencimento: {new Date(credit.dueDate).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CreditList;
