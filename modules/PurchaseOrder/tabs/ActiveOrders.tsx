
import React, { useMemo } from 'react';
import { PurchaseOrder } from '../types';
import OrderCard from '../components/OrderCard';
import { GroupByOption } from '../PurchaseOrderModule';
import { Calendar, User, Wheat, Layers } from 'lucide-react';

interface Props {
  orders: PurchaseOrder[];
  onOrderClick: (order: PurchaseOrder) => void;
  onFinalize: (order: PurchaseOrder) => void;
  onDelete: (order: PurchaseOrder) => void;
  groupBy: GroupByOption;
}

const ActiveOrders: React.FC<Props> = ({ orders, onOrderClick, onFinalize, onDelete, groupBy }) => {
  const filtered = useMemo(() => 
    orders.filter(o => ['pending', 'approved', 'transport'].includes(o.status)),
  [orders]);

  // Grouping Logic
  const groups = useMemo(() => {
    if (groupBy === 'none') return null;

    // Preprocessa chave uma única vez por pedido
    const withKeys = filtered.map(order => {
      let key = 'Outros';
      if (groupBy === 'month') {
        const date = new Date(order.date);
        const monthYear = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}|${monthYear}`;
      } else if (groupBy === 'harvest') {
        key = order.harvest || 'Safra Não Informada';
      } else if (groupBy === 'partner') {
        key = order.partnerName || 'Fornecedor Desconhecido';
      }
      return { key, order };
    });

    // Agrupa com reduce (O(n))
    const grouped = withKeys.reduce((acc, { key, order }) => {
      if (!acc[key]) acc[key] = [] as PurchaseOrder[];
      acc[key].push(order);
      return acc;
    }, {} as Record<string, PurchaseOrder[]>);

    // Ordena títulos
    return Object.entries(grouped)
      .sort((a, b) => groupBy === 'month' ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0]))
      .map(([key, value]) => ({
        title: groupBy === 'month' ? key.split('|')[1] : key,
        orders: value
      }));

  }, [filtered, groupBy]);

  const getGroupIcon = () => {
    if (groupBy === 'month') return <Calendar size={18} />;
    if (groupBy === 'harvest') return <Wheat size={18} />;
    if (groupBy === 'partner') return <User size={18} />;
    return <Layers size={18} />;
  };

  if (filtered.length === 0) {
    return <div className="text-center py-10 text-slate-500">Nenhum pedido ativo no momento.</div>;
  }

  // Render Flat List
  if (!groups) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map(order => (
          <OrderCard 
            key={order.id} 
            order={order} 
            onClick={onOrderClick} 
            onFinalize={onFinalize}
            onDelete={onDelete}
          />
        ))}
      </div>
    );
  }

  // Render Grouped List
  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.title} className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <div className="text-primary-600 bg-primary-50 p-1.5 rounded-lg">
              {getGroupIcon()}
            </div>
            <h3 className="text-lg font-bold text-slate-700 capitalize">{group.title}</h3>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {group.orders.length}
            </span>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.orders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onClick={onOrderClick}
                onFinalize={onFinalize}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActiveOrders;
