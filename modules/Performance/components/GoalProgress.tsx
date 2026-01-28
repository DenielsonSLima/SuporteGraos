
import React from 'react';
import { Target, TrendingUp } from 'lucide-react';
import { GoalMetric } from '../types';

interface Props {
  goals: GoalMetric[];
}

const GoalProgress: React.FC<Props> = ({ goals }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  const number = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col justify-center">
      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Target size={20} className="text-slate-600" />
        Metas vs. Realizado (Média Mensal)
      </h3>
      
      <div className="space-y-8">
        {goals.map((goal, index) => {
          const percentage = Math.min((goal.current / (goal.target || 1)) * 100, 100);
          const isCurrency = goal.unit === 'currency';
          const format = isCurrency ? currency : number;
          const suffix = isCurrency ? '' : ' SC';

          return (
            <div key={index}>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{goal.label}</p>
                  <p className="text-lg font-bold text-slate-800 mt-0.5">
                    {format(goal.current)}{suffix}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 mb-0.5">Meta: {format(goal.target)}{suffix}</p>
                  <p className={`text-sm font-bold ${percentage >= 100 ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
              
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    percentage >= 100 ? 'bg-emerald-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-2">
        <TrendingUp size={14} />
        <span>Metas projetadas com base em crescimento de 10-15%.</span>
      </div>
    </div>
  );
};

export default GoalProgress;
