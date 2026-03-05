
import React, { useMemo } from 'react';
import { FinancialRecord } from '../../types';
import { Calendar, DollarSign, ArrowUpRight, ArrowDownLeft, MinusCircle } from 'lucide-react';

interface Props {
  records: FinancialRecord[];
  groupBy: 'month' | 'entity';
}

const HistoryGroupedList: React.FC<Props> = ({ records, groupBy }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const groups = useMemo(() => {
    const grouped: Record<string, { title: string; records: FinancialRecord[]; total: number }> = {};

    records.forEach(r => {
      let key = '';
      if (groupBy === 'month') {
        key = new Date(r.dueDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      } else {
        key = r.entityName || 'Outros';
      }

      if (!grouped[key]) {
        grouped[key] = { title: key, records: [], total: 0 };
      }

      grouped[key].records.push(r);
      const isCredit = ['sales_order', 'loan_granted', 'receipt'].includes(r.subType || '');
      const settledVal = (r.paidValue || 0) + (r.discountValue || 0);
      grouped[key].total += isCredit ? settledVal : -settledVal;
    });

    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }, [records, groupBy]);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.title} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 capitalize flex items-center gap-2">
              {groupBy === 'month' ? <Calendar size={18} className="text-slate-400" /> : <DollarSign size={18} className="text-slate-400" />}
              {group.title}
            </h3>
            <div className={`text-sm font-bold ${group.total >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              Saldo Líquido: {currency(group.total)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-white text-xs uppercase text-slate-400 font-medium">
                <tr>
                  <th className="px-5 py-2">Data</th>
                  <th className="px-5 py-2">Descrição</th>
                  <th className="px-5 py-2 text-right">Valor Movimentado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {group.records.map(record => {
                  const isCredit = ['sales_order', 'loan_granted', 'receipt'].includes(record.subType || '');
                  const settledValue = (record.paidValue || 0) + (record.discountValue || 0);
                  const isAdjustment = record.paidValue === 0 && record.discountValue! > 0;

                  return (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-5 py-2">{date(record.issueDate)}</td>
                      <td className="px-5 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-700">{record.description}</span>
                          {isAdjustment && <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5"><MinusCircle size={8} /> Abatimento</span>}
                        </div>
                        {groupBy === 'month' && <span className="block text-xs text-slate-400">{record.entityName}</span>}
                      </td>
                      <td className={`px-5 py-2 text-right font-bold flex items-center justify-end gap-1 ${isCredit ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isCredit ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                        {currency(settledValue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HistoryGroupedList;
