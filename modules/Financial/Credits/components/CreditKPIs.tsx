import React, { useMemo } from 'react';
import { TrendingUp, DollarSign, Zap, Clock } from 'lucide-react';
import { FinancialRecord } from '../../types';
import { creditService } from '../../../../services/financial/creditService';

interface Props {
  credits: FinancialRecord[];
}

const CreditKPIs: React.FC<Props> = ({ credits }) => {
  const currency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const stats = useMemo(() => {
    const activeCredits = credits.filter(c => c.status === 'pending' || c.status === 'partial');
    const totalInvested = activeCredits.reduce((sum, c) => sum + (c.originalValue || 0), 0);
    
    const totalEarnings = activeCredits.reduce((sum, c) => {
      const monthsElapsed = Math.max(1, Math.floor(
        (new Date().getTime() - new Date(c.issueDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
      ));
      const earnings = creditService.calculateEarnings(c.originalValue || 0, c.paidValue || 0, monthsElapsed);
      return sum + earnings;
    }, 0);

    const averageRate = activeCredits.length > 0
      ? activeCredits.reduce((sum, c) => sum + (c.paidValue || 0), 0) / activeCredits.length
      : 0;

    return {
      count: activeCredits.length,
      totalInvested,
      totalEarnings,
      averageRate,
    };
  }, [credits]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Investido */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Capital Investido</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{currency(stats.totalInvested)}</p>
          </div>
          <div className="p-3 bg-blue-500 bg-opacity-20 rounded-xl">
            <DollarSign size={24} className="text-blue-600" />
          </div>
        </div>
        <p className="text-xs text-blue-600 font-medium">{stats.count} crédito{stats.count !== 1 ? 's' : ''} ativo{stats.count !== 1 ? 's' : ''}</p>
      </div>

      {/* Rendimentos Totais */}
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 border border-emerald-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Rendimentos</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{currency(stats.totalEarnings)}</p>
          </div>
          <div className="p-3 bg-emerald-500 bg-opacity-20 rounded-xl">
            <TrendingUp size={24} className="text-emerald-600" />
          </div>
        </div>
        <p className="text-xs text-emerald-600 font-medium">+{((stats.totalEarnings / stats.totalInvested) * 100).toFixed(2)}% do capital</p>
      </div>

      {/* Taxa Média */}
      <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-2xl p-6 border border-violet-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-violet-600 uppercase tracking-widest">Taxa Média</p>
            <p className="text-2xl font-black text-violet-700 mt-1">{stats.averageRate.toFixed(2)}%</p>
          </div>
          <div className="p-3 bg-violet-500 bg-opacity-20 rounded-xl">
            <Zap size={24} className="text-violet-600" />
          </div>
        </div>
        <p className="text-xs text-violet-600 font-medium">ao mês</p>
      </div>

      {/* Valor Total */}
      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Total Final</p>
            <p className="text-2xl font-black text-orange-700 mt-1">
              {currency(stats.totalInvested + stats.totalEarnings)}
            </p>
          </div>
          <div className="p-3 bg-orange-500 bg-opacity-20 rounded-xl">
            <Clock size={24} className="text-orange-600" />
          </div>
        </div>
        <p className="text-xs text-orange-600 font-medium">Capital + Rendimentos</p>
      </div>
    </div>
  );
};

export default CreditKPIs;
