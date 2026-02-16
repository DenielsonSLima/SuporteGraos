
import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, AlertCircle, Calendar } from 'lucide-react';
import { FinancialRecord } from '../../Financial/types';

interface Props {
  data: {
    receivables: FinancialRecord[];
    tradePayables: FinancialRecord[];
    expenses: FinancialRecord[];
  };
}

const FinancialPendingLists: React.FC<Props> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const date = (val: string) => {
    const d = new Date(val);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const isOverdue = (dateStr: string) => {
    return new Date(dateStr) < new Date(new Date().setHours(0,0,0,0));
  };

  const ListSection = ({ title, items, type }: { title: string, items: FinancialRecord[], type: 'in' | 'out' | 'expense' }) => {
    let icon = <ArrowUpCircle size={18} className="text-emerald-500" />;
    let headerColor = 'text-emerald-700 bg-emerald-50 border-emerald-100';
    
    if (type === 'out') {
      icon = <ArrowDownCircle size={18} className="text-rose-500" />;
      headerColor = 'text-rose-700 bg-rose-50 border-rose-100';
    } else if (type === 'expense') {
      icon = <AlertCircle size={18} className="text-slate-500" />;
      headerColor = 'text-slate-700 bg-slate-50 border-slate-200';
    }

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className={`px-4 py-3 border-b flex items-center gap-2 font-bold text-sm ${headerColor}`}>
          {icon}
          {title}
        </div>
        <div className="overflow-y-auto max-h-60 p-0">
          {items.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 italic">
              Nenhuma pendência próxima.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <tbody className="divide-y divide-slate-50">
                {items.map(item => {
                  const overdue = isOverdue(item.dueDate);
                  const balance = item.originalValue - item.paidValue;
                  const secondary = item.subType === 'freight'
                    ? [item.entityName, item.driverName].filter(Boolean).join(' • ') || item.entityName
                    : item.entityName;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="pl-4 py-3">
                        <div className={`flex items-center gap-1 font-bold ${overdue ? 'text-red-600' : 'text-slate-600'}`}>
                          <Calendar size={10} />
                          {date(item.dueDate)}
                        </div>
                        {overdue && <span className="text-[9px] text-red-500 font-bold uppercase">Vencido</span>}
                      </td>
                      <td className="px-2 py-3">
                        <div className="font-medium text-slate-800 line-clamp-1" title={item.description}>{item.description}</div>
                        <div className="text-slate-500 text-[10px] line-clamp-1">{secondary}</div>
                      </td>
                      <td className="pr-4 py-3 text-right">
                        <div className={`font-bold ${type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {currency(balance)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[10px] text-center text-slate-400 font-medium">
          Exibindo os 5 vencimentos mais urgentes
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 mt-8">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 px-1">
        <AlertCircle size={20} className="text-amber-500" />
        Pendências Financeiras Imediatas
      </h3>
      <ListSection title="Contas a Receber" items={data.receivables} type="in" />
      <ListSection title="Contas a Pagar (Fornecedores & Fretes)" items={data.tradePayables} type="out" />
      <ListSection title="Despesas Administrativas em Aberto" items={data.expenses} type="expense" />
    </div>
  );
};

export default FinancialPendingLists;
