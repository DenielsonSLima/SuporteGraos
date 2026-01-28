
import React, { useMemo } from 'react';
import { PurchaseOrder } from '../types';
import OrderCard from '../components/OrderCard';
import { GroupByOption } from '../PurchaseOrderModule';
import { Calendar, User, Wheat, Layers } from 'lucide-react';

interface Props {
  orders: PurchaseOrder[];
  onOrderClick: (order: PurchaseOrder) => void;
  onDelete: (order: PurchaseOrder) => void;
  groupBy: GroupByOption;
}

const AllOrders: React.FC<Props> = ({ orders, onOrderClick, onDelete, groupBy }) => {
  
  const groups = useMemo(() => {
    if (groupBy === 'none') return null;

    const grouped: Record<string, PurchaseOrder[]> = {};
    
    orders.forEach(order => {
      let key = 'Outros';
      
      if (groupBy === 'month') {
        const date = new Date(order.date);
        const display = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}|${display}`;
      } else if (groupBy === 'harvest') {
        key = order.harvest || 'Safra Não Informada';
      } else if (groupBy === 'partner') {
        key = order.partnerName || 'Fornecedor Desconhecido';
      }

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(order);
    });

    return Object.entries(grouped).sort((a, b) => {
      if (groupBy === 'month') return b[0].localeCompare(a[0]);
      return a[0].localeCompare(b[0]);
    }).map(([key, value]) => ({
      title: groupBy === 'month' ? key.split('|')[1] : key,
      orders: value
    }));

  }, [orders, groupBy]);

  const getGroupIcon = () => {
    if (groupBy === 'month') return <Calendar size={18} />;
    if (groupBy === 'harvest') return <Wheat size={18} />;
    if (groupBy === 'partner') return <User size={18} />;
    return <Layers size={18} />;
  };

  if (orders.length === 0) {
    return <div className="text-center py-10 text-slate-500">Nenhum pedido cadastrado.</div>;
  }

  if (!groups) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {orders.map(order => (
          <OrderCard 
            key={order.id} 
            order={order} 
            onClick={onOrderClick}
            onDelete={onDelete} 
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.title} className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <div className="text-slate-600 bg-slate-100 p-1.5 rounded-lg">
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
                onDelete={onDelete} 
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AllOrders;
