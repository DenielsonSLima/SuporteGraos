
import React from 'react';
import { FinancialRecord } from '../../types';
import { DollarSign, Calendar, User, Tag, Clock, CheckCircle2, AlertCircle, ChevronRight, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { getCategoryIcon } from '../../../../services/expenseCategoryService';

interface Props {
  records: FinancialRecord[];
  onSelect: (record: FinancialRecord) => void;
  onEdit: (record: FinancialRecord) => void;
  onDelete: (record: FinancialRecord) => void;
  onPay: (record: FinancialRecord) => void;
}

const AdminExpenseCardList: React.FC<Props> = ({ records, onSelect, onEdit, onDelete, onPay }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'paid':
        return { label: 'Liquidado', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: CheckCircle2 };
      case 'overdue':
        return { label: 'Vencido', color: 'text-rose-600 bg-rose-50 border-rose-100', icon: AlertCircle };
      default:
        return { label: 'Em aberto', color: 'text-amber-600 bg-amber-50 border-amber-100', icon: Clock };
    }
  };

  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  // Sort records by launch (issueDate) DESC
  const sortedRecords = [...records].sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-1">
      {sortedRecords.map((record) => {
        const status = getStatusInfo(record.status);
        const StatusIcon = status.icon;
        
        // Find category type to get correct icon
        // For simplicity, we'll use a generic icon if lookup is complex, 
        // but AdminExpensesTab passes display-ready category names.
        const Icon = status.label === 'Liquidado' ? CheckCircle2 : Tag;

        return (
          <div 
            key={record.id}
            onClick={() => onSelect(record)}
            className="group relative bg-white rounded-[2rem] border-2 border-slate-100 p-6 transition-all hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50 cursor-pointer overflow-hidden"
          >
            {/* Status Badge */}
            <div className={`absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1 rounded-full border ${status.color}`}>
               <StatusIcon size={12} className="stroke-[3]" />
               <span className="text-[10px] font-black uppercase tracking-widest">{status.label}</span>
            </div>

            {/* Header: Category & Icon */}
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <Icon size={20} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none block mb-1">
                  {record.category}
                </span>
                <h3 className="font-bold text-slate-800 line-clamp-1">{record.description}</h3>
              </div>
            </div>

            {/* Main Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 flex items-center gap-1">
                  <Calendar size={10} /> Vencimento
                </span>
                <span className="text-sm font-bold text-slate-700">{date(record.dueDate)}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 flex items-center gap-1">
                  <DollarSign size={10} /> Valor Total
                </span>
                <span className="text-lg font-black text-slate-900 leading-none">{currency(record.originalValue)}</span>
              </div>
            </div>

            {/* Entity/Provider */}
            <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 max-w-[60%]">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                  <User size={12} className="text-slate-400" />
                </div>
                <span className="text-[11px] font-bold text-slate-500 truncate">{record.entityName}</span>
              </div>

              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                {record.status !== 'paid' ? (
                  <button 
                    onClick={() => onPay(record)}
                    className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                  >
                    <DollarSign size={12} /> Baixar
                  </button>
                ) : (
                  <div className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 size={16} />
                    <span className="text-[10px] font-black uppercase italic">Pago</span>
                  </div>
                )}
                
                <div className="relative">
                  <button 
                    onClick={() => setOpenMenuId(openMenuId === record.id ? null : record.id)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  
                  {openMenuId === record.id && (
                    <div className="absolute right-0 bottom-full mb-2 w-40 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-10 animate-in zoom-in-95 fill-mode-both">
                      <button 
                        onClick={() => { onEdit(record); setOpenMenuId(null); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <Edit size={14} /> Editar
                      </button>
                      <button 
                        onClick={() => { onDelete(record); setOpenMenuId(null); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={14} /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Glow on hover */}
            <div className="absolute -inset-x-0 -bottom-1 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        );
      })}
    </div>
  );
};

export default AdminExpenseCardList;
