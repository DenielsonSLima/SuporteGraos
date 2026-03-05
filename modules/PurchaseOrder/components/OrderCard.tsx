
import React, { useMemo } from 'react';
import { 
  MapPin, Wheat, Trash2, Calendar, User, DollarSign, ChevronRight, CheckCircle, Handshake, CreditCard
} from 'lucide-react';
import { PurchaseOrder, OrderStatus } from '../types';
import { formatMoney } from '../../../utils/formatters';
import { useOrderCardStats } from '../hooks/useOrderCardStats';

interface Props {
  order: PurchaseOrder;
  onClick: (order: PurchaseOrder) => void;
  onFinalize?: (order: PurchaseOrder) => void;
  onDelete?: (order: PurchaseOrder) => void;
}

const statusConfig: Record<OrderStatus, { label: string; color: string; bg: string; border: string }> = {
  draft: { label: 'Rascunho', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
  pending: { label: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  approved: { label: 'Aberto', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  transport: { label: 'Em Trânsito', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  completed: { label: 'Finalizado', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  canceled: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

const OrderCard: React.FC<Props> = React.memo(({ order, onClick, onFinalize, onDelete }) => {
  // Hook co-localizado — encapsula LoadingCache + ledgerService + loadingService subscriptions
  const stats = useOrderCardStats(order);
  
  const status = statusConfig[order.status];
  const currency = (val: number) => formatMoney(val);
  const number = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(val);
  
  const date = (val: string) => {
    if (!val) return '-';
    if (val.includes('T')) return new Date(val).toLocaleDateString('pt-BR');
    const [year, month, day] = val.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(order);
  };

  return (
    <div className="group relative bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col select-none">
      <div className="absolute inset-0 z-0 cursor-pointer" onClick={() => onClick(order)} />
      
      <div className="relative z-10 p-6 pb-4 pointer-events-none">
        <div className="flex justify-between items-start mb-4">
          <span className="font-mono text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">#{order.number}</span>
          <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${status.bg} ${status.color} ${status.border} shadow-sm`}>{status.label}</div>
        </div>
        <h3 className="font-black text-slate-900 text-lg leading-tight truncate uppercase tracking-tighter italic">{order.partnerName}</h3>
        
        <div className="space-y-2 mt-4">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold uppercase tracking-tight">
            <MapPin size={14} className="text-primary-500 shrink-0" /> 
            <span className="truncate">
              {(() => {
                const city = order.useRegisteredLocation 
                  ? (order.partnerCity || '...')
                  : (order.loadingCity || order.partnerCity || '...');
                const state = order.useRegisteredLocation 
                  ? (order.partnerState || '...')
                  : (order.loadingState || order.partnerState || '...');
                const base = `${city} - ${state}`;
                const complement = (!order.useRegisteredLocation && order.loadingComplement) ? ` (${order.loadingComplement})` : '';
                return base + complement;
              })()}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold uppercase tracking-tight">
            <Wheat size={14} className="text-amber-500 shrink-0" /> 
            <span className="truncate">{order.items.length > 0 ? order.items.map(i => i.productName).join(', ') : 'Produto N/D'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase">
            <Calendar size={14} className="shrink-0" /> 
            <span>{date(order.date)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase border-t border-slate-50 pt-2 mt-2">
            <User size={12} className="text-blue-400 shrink-0" /> 
            <span className="truncate">Sócio: {order.consultantName}</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-6 py-4 bg-slate-50 border-y border-slate-100 pointer-events-none">
        <div className="flex justify-between items-end mb-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Carga Física</span>
          <div className="text-xs font-black text-slate-800 leading-none">{number(stats.loadedQty)} <span className="text-slate-400">/</span> {stats.contractQty > 0 ? `${number(stats.contractQty)} SC` : 'Aberto'}</div>
        </div>
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-700 ${stats.progress >= 100 ? 'bg-emerald-500' : 'bg-primary-500'}`} style={{ width: `${stats.contractQty > 0 ? stats.progress : 0}%` }} />
        </div>
      </div>

      <div className="relative z-10 pointer-events-none p-6 space-y-4 mt-auto">
        <div className="flex justify-between items-center">
            <div>
                <span className="text-[9px] font-black text-slate-400 uppercase leading-none block mb-1">Carregado</span>
                <span className="text-base font-black text-slate-900 tracking-tighter">{currency(stats.totalLoadedValue)}</span>
            </div>
            <div className="text-right">
                <span className="text-[9px] font-black text-emerald-600 uppercase leading-none block mb-1">Liquidado</span>
                <span className="text-base font-black text-emerald-700 tracking-tighter">{currency(stats.totalSettled)}</span>
            </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
          {stats.advanceBalance > 0.05 ? (
              <>
                 <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Adiantamento</span>
                 <span className="text-lg font-black text-amber-700 flex items-center gap-1 tracking-tighter">
                    <CreditCard size={16} /> {currency(stats.advanceBalance)}
                 </span>
              </>
          ) : (
              <>
                 <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Saldo Aberto</span>
                 <span className={`text-lg font-black tracking-tighter ${stats.pendingValue > 0.05 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {stats.pendingValue > 0.05 ? currency(stats.pendingValue) : <span className="flex items-center gap-1.5"><CheckCircle size={16}/> QUITADO</span>}
                 </span>
              </>
          )}
        </div>
      </div>

      <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-[-10px] group-hover:translate-y-0">
        <button 
          onClick={handleDelete}
          className="p-2.5 rounded-xl bg-white text-rose-600 shadow-xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100 active:scale-90" 
          title="Excluir Pedido"
        >
          <Trash2 size={20} />
        </button>
        <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xl cursor-pointer hover:bg-slate-800 transition-all active:scale-90" onClick={() => onClick(order)}><ChevronRight size={20} /></div>
      </div>
    </div>
  );
});

export default OrderCard;
