
import React, { useMemo } from 'react';
import { 
  MapPin, Trash2, Calendar, Check, User, TrendingUp, Scale, DollarSign, ChevronRight, PackageCheck, AlertCircle, CheckCircle, Package
} from 'lucide-react';
import { SalesOrder, SalesStatus } from '../types';
import { formatMoney } from '../../../utils/formatters';

interface Props {
  order: SalesOrder;
  onClick: (order: SalesOrder) => void;
  onDelete?: (order: SalesOrder) => void;
  onFinalize?: (order: SalesOrder) => void;
}

const statusConfig: Record<SalesStatus, { label: string; color: string; bg: string; border: string }> = {
  draft: { label: 'Rascunho', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
  pending: { label: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  approved: { label: 'Aprovado', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  completed: { label: 'Finalizado', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  canceled: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

const SalesOrderCard: React.FC<Props> = React.memo(({ order, onClick, onDelete, onFinalize }) => {
  const status = statusConfig[order.status];
  const currency = (val: number) => formatMoney(val);
  const number = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(val);
  
  const date = (val: string) => {
    if (!val) return '-';
    if (val.includes('T')) return new Date(val).toLocaleDateString('pt-BR');
    const [year, month, day] = val.split('-');
    return `${day}/${month}/${year}`;
  };

  // ═══════ Stats vindos do SQL (VIEW vw_sales_orders_enriched) ═══════
  // Zero cálculo no frontend — tudo pré-calculado pelo banco de dados
  const stats = useMemo(() => {
    const deliveredQtySc = order.deliveredQtySc ?? 0;
    const contractQtySc = order.quantity ?? 0;
    const deliveredValue = order.deliveredValue ?? 0;
    const receivedValue = order.paidValue ?? 0;
    const pendingValue = Math.max(0, deliveredValue - receivedValue);
    const progress = contractQtySc > 0 ? Math.min((deliveredQtySc / contractQtySc) * 100, 100) : 0;

    return { deliveredQtySc, contractQtySc, deliveredValue, receivedValue, pendingValue, progress };
  }, [order]);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (onDelete) onDelete(order);
  };

  const handleFinalizeClick = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (onFinalize) onFinalize(order);
  };

  return (
    <div className="group relative bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col select-none hover:border-emerald-300">
      <div className="absolute inset-0 z-0 cursor-pointer" onClick={() => onClick(order)} />

      <div className="relative z-10 p-6 pb-4 pointer-events-none">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">#{order.number}</span>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${status.bg} ${status.color} ${status.border} shadow-sm`}>{status.label}</div>
            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1"><Calendar size={12} /> {date(order.date)}</span>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-black text-slate-900 text-lg leading-tight line-clamp-1 uppercase tracking-tighter" title={order.customerName}>
            {order.customerName}
          </h3>
          {order.customerNickname && (
            <div className="text-[11px] font-bold text-emerald-600/70 uppercase tracking-wider mt-0.5 line-clamp-1">
              {order.customerNickname}
            </div>
          )}
        </div>

        <div className="space-y-2 mt-4">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold uppercase tracking-tight">
            <User size={14} className="text-emerald-500 shrink-0" />
            <span>Vendedor: {order.consultantName || 'N/D'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-700 font-bold uppercase tracking-tight">
            <Package size={14} className="text-blue-500 shrink-0" />
            <span>{number(stats.contractQtySc)} SC @ {currency(order.unitPrice || 0)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold uppercase tracking-tight">
            <MapPin size={14} className="text-slate-300 shrink-0" />
            <span className="truncate">{order.customerCity || 'Local N/D'} - {order.customerState}</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-6 py-4 bg-slate-50 border-y border-slate-100 pointer-events-none">
        <div className="flex justify-between items-end mb-2.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Progresso Entrega</span>
          <div className="text-xs font-black leading-none">
            <span className="text-emerald-600">{number(stats.deliveredQtySc)}</span> 
            <span className="text-slate-300 mx-0.5">/</span> 
            <span className="text-slate-600">{stats.contractQtySc > 0 ? `${number(stats.contractQtySc)} SC` : 'Aberto'}</span>
          </div>
        </div>
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-700 ${stats.progress >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${stats.contractQtySc > 0 ? stats.progress : 0}%` }} />
        </div>
      </div>

      <div className="relative z-10 pointer-events-none mt-auto p-6 space-y-4">
        <div className="flex justify-between items-center">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase leading-none block mb-1">Total Entregue</span>
              <span className="text-base font-black text-slate-800 tracking-tighter">{currency(stats.deliveredValue)}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black text-emerald-600 uppercase leading-none block mb-1">Total Recebido</span>
              <span className="text-base font-black text-emerald-700 tracking-tighter">{currency(stats.receivedValue)}</span>
            </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Saldo a Receber</span>
          <span className="text-xl font-black text-amber-700 tracking-tighter">{currency(stats.pendingValue)}</span>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-[-10px] group-hover:translate-y-0">
        {onFinalize && order.status !== 'completed' && order.status !== 'canceled' && (
          <button onClick={handleFinalizeClick} className="p-2.5 rounded-xl bg-white border border-emerald-100 text-emerald-600 shadow-xl hover:bg-emerald-600 hover:text-white transition-all active:scale-90" title="Finalizar Venda"><Check size={20} /></button>
        )}
        {onDelete && (
          <button onClick={handleDeleteClick} className="p-2.5 rounded-xl bg-white border border-red-100 text-red-500 shadow-xl hover:bg-red-500 hover:text-white transition-all active:scale-90" title="Excluir Venda"><Trash2 size={20} /></button>
        )}
        <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xl cursor-pointer hover:bg-slate-800 transition-all active:scale-90" onClick={() => onClick(order)}><ChevronRight size={20} /></div>
      </div>
    </div>
  );
});

export default SalesOrderCard;
