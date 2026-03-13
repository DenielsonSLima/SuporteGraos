
import React, { useMemo, useState, useEffect } from 'react';
import { FinancialRecord } from '../../types';
import { DollarSign, Calendar, MoreHorizontal } from 'lucide-react';
import { financialService, getCategoryIcon } from '../../../../services/financialService';
import type { ExpenseCategory } from '../../../../services/expenseCategoryService';

interface Props {
  records: FinancialRecord[];
  categories: ExpenseCategory[];
  onPay: (record: FinancialRecord) => void;
  onEdit: (record: FinancialRecord) => void;
  onDelete: (record: FinancialRecord) => void;
}

// Structure: Month -> Type -> Records
interface TypeGroup {
  type: string; // 'Despesas Fixas', 'Despesas Variáveis', etc.
  typeKey: 'fixed' | 'variable' | 'administrative' | 'custom';
  total: number;
  categories: Record<string, { name: string; total: number; records: FinancialRecord[] }>;
}

interface MonthGroup {
  title: string; // "Outubro 2023"
  sortKey: string; // "2023-10"
  total: number;
  types: Record<string, TypeGroup>;
}

const AdminExpenseGroupedList: React.FC<Props> = ({ records, categories: expenseDefinitions, onPay, onEdit, onDelete }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const getExpenseTypeInfo = (categoryName: string) => {
    // 1. Find the main category that contains this subtype
    const mainCategory = expenseDefinitions.find(cat => 
        cat.subtypes.some(sub => sub.name === categoryName)
    );

    if (mainCategory) {
        return { name: mainCategory.name, key: mainCategory.type };
    }
    return { name: 'Outras Despesas', key: 'custom' as const };
  };

  const getColorForType = (typeKey: string) => {
      switch(typeKey) {
          case 'fixed': return 'bg-blue-100 text-blue-700 border-blue-200';
          case 'variable': return 'bg-amber-100 text-amber-700 border-amber-200';
          case 'administrative': return 'bg-slate-100 text-slate-700 border-slate-200';
          default: return 'bg-gray-100 text-gray-700 border-gray-200';
      }
  };

  // Grouping Logic
  const groupedData = useMemo(() => {
    const groups: Record<string, MonthGroup> = {};

    records.forEach(r => {
      // 1. Month Grouping
      const d = new Date(r.dueDate);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthTitle = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

      if (!groups[monthKey]) {
        groups[monthKey] = {
          title: monthTitle,
          sortKey: monthKey,
          total: 0,
          types: {}
        };
      }

      // 2. Type Grouping
      const typeInfo = getExpenseTypeInfo(r.category);
      const typeGroupKey = typeInfo.key;

      if (!groups[monthKey].types[typeGroupKey]) {
        groups[monthKey].types[typeGroupKey] = {
          type: typeInfo.name,
          typeKey: typeGroupKey,
          total: 0,
          categories: {}
        };
      }

      // Category Grouping inside Type
      const categoryKey = r.category || 'Sem categoria';
      if (!groups[monthKey].types[typeGroupKey].categories[categoryKey]) {
        groups[monthKey].types[typeGroupKey].categories[categoryKey] = {
          name: categoryKey,
          total: 0,
          records: []
        };
      }

      // Add Record
      const pendingVal = r.originalValue - r.paidValue;
      groups[monthKey].types[typeGroupKey].categories[categoryKey].records.push(r);
      groups[monthKey].types[typeGroupKey].categories[categoryKey].total += pendingVal;
      groups[monthKey].types[typeGroupKey].total += pendingVal;
      groups[monthKey].total += pendingVal;
    });

    // Convert to Array and Sort by Month (Ascending due dates)
    return Object.values(groups).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [records]);

  if (records.length === 0) {
    return <div className="text-center py-10 text-slate-500">Nenhuma despesa encontrada para os filtros aplicados.</div>;
  }

  return (
    <div className="space-y-8">
      {groupedData.map((monthGroup) => (
        <div key={monthGroup.sortKey} className="space-y-4">
          
          {/* Month Header */}
          <div className="flex items-center gap-3 border-b border-slate-300 pb-2">
            <h3 className="text-xl font-bold text-slate-800 capitalize">{monthGroup.title}</h3>
            <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Total: {currency(monthGroup.total)}
            </span>
          </div>

          {/* Render Types within Month */}
          {Object.values(monthGroup.types).sort((a: TypeGroup, b: TypeGroup) => {
              // Custom sort order: Fixed -> Variable -> Admin -> Custom
              const order: Record<string, number> = { fixed: 1, variable: 2, administrative: 3, custom: 4 };
              return (order[a.typeKey] || 99) - (order[b.typeKey] || 99);
          }).map((typeGroup: TypeGroup) => {
             const Icon = getCategoryIcon(typeGroup.typeKey);
             
             return (
              <div key={typeGroup.typeKey} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                
                {/* Type Header */}
                <div className={`px-5 py-3 flex items-center justify-between border-b ${getColorForType(typeGroup.typeKey).replace('bg-', 'bg-opacity-50 bg-').replace('text-', 'text-').replace('border-', 'border-')}`}>
                  <div className="flex items-center gap-2">
                    {Icon && <Icon size={16} />}
                    <h4 className="font-bold text-sm uppercase tracking-wide">{typeGroup.type}</h4>
                  </div>
                  <span className="font-bold text-sm">{currency(typeGroup.total)}</span>
                </div>

                {/* Records Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-400 font-medium">
                      <tr>
                        <th className="px-5 py-2 w-32">Vencimento</th>
                        <th className="px-5 py-2">Descrição / Fornecedor</th>
                        <th className="px-5 py-2 w-40">Subcategoria</th>
                        <th className="px-5 py-2 text-right">Valor</th>
                        <th className="px-5 py-2 text-center w-24">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {Object.values(typeGroup.categories).map((categoryGroup) => (
                        <React.Fragment key={categoryGroup.name}>
                          <tr className="bg-slate-100/60">
                            <td className="px-5 py-2 text-xs font-black uppercase tracking-widest text-slate-500" colSpan={5}>
                              {categoryGroup.name} • {currency(categoryGroup.total)}
                            </td>
                          </tr>
                          {categoryGroup.records.map(record => {
                            const hasPayment = (record.paidValue || 0) > 0 || (record.discountValue || 0) > 0;
                            const paymentDate = record.settlementDate || record.issueDate || record.dueDate;
                            return (
                            <React.Fragment key={record.id}>
                              <tr 
                                onClick={() => onPay(record)}
                                className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                              >
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <Calendar size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                  <span className={record.status === 'overdue' ? 'text-red-600 font-bold' : 'text-slate-700'}>
                                    {date(record.dueDate)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <div className="font-medium text-slate-800">{record.description}</div>
                                <div className="text-xs text-slate-500">{record.entityName}</div>
                              </td>
                              <td className="px-5 py-3 text-xs">
                                <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">{record.category}</span>
                              </td>
                              <td className="px-5 py-3 text-right font-bold text-slate-700">
                                {currency(record.originalValue)}
                              </td>
                              <td className="px-5 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {record.status !== 'paid' && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); onPay(record); }}
                                      className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 p-1.5 rounded-lg transition-colors flex items-center gap-1 px-2"
                                      title="Dar Baixa (Pagar)"
                                    >
                                      <DollarSign size={14} />
                                      <span className="text-xs font-bold">Baixar</span>
                                    </button>
                                  )}
                                  <div className="relative">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === record.id ? null : record.id); }}
                                      className="text-slate-400 hover:text-slate-600 p-1.5 rounded hover:bg-slate-100"
                                      title="Mais ações"
                                    >
                                      <MoreHorizontal size={16} />
                                    </button>
                                    {openMenuId === record.id && (
                                      <div 
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-xl z-20 overflow-hidden"
                                      >
                                        {record.status !== 'paid' && (
                                          <button
                                            onClick={() => { setOpenMenuId(null); onEdit(record); }}
                                            className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                          >
                                            Editar
                                          </button>
                                        )}
                                        <button
                                          onClick={() => { setOpenMenuId(null); onDelete(record); }}
                                          className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                                        >
                                          Excluir
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              </tr>

                              {hasPayment && (
                                <tr className="bg-slate-50/60">
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-2">
                                      <Calendar size={14} className="text-emerald-500" />
                                      <span className="text-slate-700 font-semibold">{paymentDate ? date(paymentDate) : '-'}</span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="font-bold text-emerald-700">Pagamento efetuado</div>
                                    <div className="text-xs text-slate-500">Conta: {record.bankAccount || 'Não informada'}</div>
                                  </td>
                                  <td className="px-5 py-3 text-xs">
                                    <span className="bg-emerald-50 px-2 py-1 rounded text-emerald-700">Baixa</span>
                                  </td>
                                  <td className="px-5 py-3 text-right font-bold text-emerald-700">
                                    {currency(record.paidValue || 0)}
                                  </td>
                                  <td className="px-5 py-3 text-center text-xs text-slate-400">—</td>
                                </tr>
                              )}

                              {(record.discountValue || 0) > 0 && (
                                <tr className="bg-amber-50/60">
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-2">
                                      <Calendar size={14} className="text-amber-500" />
                                      <span className="text-slate-700 font-semibold">{paymentDate ? date(paymentDate) : '-'}</span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="font-bold text-amber-700">Desconto / Abatimento</div>
                                    <div className="text-xs text-slate-500">Aplicado na baixa</div>
                                  </td>
                                  <td className="px-5 py-3 text-xs">
                                    <span className="bg-amber-100 px-2 py-1 rounded text-amber-700">Desconto</span>
                                  </td>
                                  <td className="px-5 py-3 text-right font-bold text-amber-700">
                                    {currency(record.discountValue || 0)}
                                  </td>
                                  <td className="px-5 py-3 text-center text-xs text-slate-400">—</td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default AdminExpenseGroupedList;
