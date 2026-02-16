
import React, { useMemo } from 'react';
import { FinancialRecord } from '../../types';
import { ChevronRight, DollarSign, Calendar, FileText, CheckSquare, Square } from 'lucide-react';

interface Props {
  records: FinancialRecord[];
  selectedIds: string[];
  onToggleSelection: (id: string) => void;
  onReceive: (record: FinancialRecord) => void;
}

interface GroupedData {
  clientName: string;
  total: number;
  count: number;
  records: FinancialRecord[];
}

const ReceivablesGroupedList: React.FC<Props> = ({ records, selectedIds, onToggleSelection, onReceive }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  // Grouping Logic
  const groups = useMemo(() => {
    const grouped: Record<string, GroupedData> = {};
    
    records.forEach(r => {
      const client = r.entityName || 'Cliente Não Identificado';
      if (!grouped[client]) {
        grouped[client] = { clientName: client, total: 0, count: 0, records: [] };
      }
      grouped[client].records.push(r);
      grouped[client].total += (r.originalValue - r.paidValue);
      grouped[client].count += 1;
    });

    // Sort clients by total value (descending)
    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }, [records]);

  const toggleGroupSelection = (groupRecords: FinancialRecord[]) => {
    // Check if all in group are selected
    const allSelected = groupRecords.every(r => selectedIds.includes(r.id));
    
    groupRecords.forEach(r => {
      if (r.status !== 'paid') {
        if (allSelected) {
          // Deselect all
          if (selectedIds.includes(r.id)) onToggleSelection(r.id);
        } else {
          // Select all
          if (!selectedIds.includes(r.id)) onToggleSelection(r.id);
        }
      }
    });
  };

  if (records.length === 0) {
    return <div className="text-center py-10 text-slate-500">Nenhum título encontrado.</div>;
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const isGroupFullySelected = group.records.every(r => selectedIds.includes(r.id) || r.status === 'paid');

        return (
          <div key={group.clientName} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            
            {/* Group Header */}
            <div className="bg-emerald-50/50 px-5 py-3 flex items-center justify-between border-b border-emerald-100">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => toggleGroupSelection(group.records)}
                  className="text-emerald-700 hover:text-emerald-900 transition-colors"
                >
                  {isGroupFullySelected ? <CheckSquare size={20} /> : <Square size={20} />}
                </button>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{group.clientName}</h3>
                  <span className="text-xs text-slate-500">{group.count} títulos pendentes</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium uppercase">Total a Receber</span>
                <span className="text-lg font-bold text-emerald-600">{currency(group.total)}</span>
              </div>
            </div>

            {/* Records Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-white border-b border-slate-100 text-xs uppercase text-slate-400 font-medium">
                  <tr>
                    <th className="px-5 py-2 w-10"></th>
                    <th className="px-5 py-2">Vencimento</th>
                    <th className="px-5 py-2">Descrição / Pedido</th>
                    <th className="px-5 py-2 text-right">Valor</th>
                    <th className="px-5 py-2 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {group.records.map(record => {
                    const isSelected = selectedIds.includes(record.id);
                    return (
                      <tr key={record.id} className={`hover:bg-slate-50 ${isSelected ? 'bg-emerald-50/30' : ''}`}>
                        <td className="px-5 py-3">
                          <button 
                            onClick={() => onToggleSelection(record.id)}
                            className={`${isSelected ? 'text-emerald-600' : 'text-slate-300 hover:text-slate-400'}`}
                          >
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-slate-400" />
                            <span className={record.status === 'overdue' ? 'text-red-600 font-bold' : 'text-slate-700'}>
                              {date(record.dueDate)}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-medium text-slate-800">{record.description}</div>
                          {record.notes && (
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <FileText size={10} /> {record.notes}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-slate-700">
                          {currency(record.originalValue - record.paidValue)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {record.status !== 'paid' && (
                            <button 
                              onClick={() => onReceive(record)}
                              className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 p-1.5 rounded-lg transition-colors inline-flex items-center gap-1 px-2"
                              title="Receber Individualmente"
                            >
                              <DollarSign size={14} />
                              <span className="text-xs font-bold">Baixar</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ReceivablesGroupedList;
