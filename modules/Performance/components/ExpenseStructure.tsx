
import React from 'react';
import { Anchor, TrendingUp, Briefcase, ChevronRight } from 'lucide-react';
import { ExpenseCategorySummary } from '../types';

interface Props {
  data: ExpenseCategorySummary[];
}

const ExpenseStructure: React.FC<Props> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getStyle = (type: string) => {
    switch (type) {
      case 'fixed': return { icon: Anchor, color: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500' };
      case 'variable': return { icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-500' };
      default: return { icon: Briefcase, color: 'text-slate-600', bg: 'bg-slate-50', bar: 'bg-slate-500' };
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {data.map((category) => {
        const style = getStyle(category.type);
        const Icon = style.icon;

        return (
          <div key={category.type} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            {/* Header */}
            <div className={`p-5 border-b border-slate-100 ${style.bg} flex justify-between items-center`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-white shadow-sm ${style.color}`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">{category.label}</h3>
              </div>
              <span className="font-black text-slate-900">{currency(category.total)}</span>
            </div>

            {/* List */}
            <div className="p-5 flex-1 space-y-5">
              {category.items.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs italic font-medium">Nenhum lançamento no período.</div>
              ) : (
                category.items.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-bold text-slate-600 truncate mr-2">{item.name}</span>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-black text-slate-900 block leading-none">{currency(item.value)}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase">{item.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${style.bar}`} 
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-tighter">
              <span>Peso no Grupo</span>
              <ChevronRight size={12} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ExpenseStructure;
