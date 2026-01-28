
import React from 'react';
import { Truck, FileText, DollarSign, ChevronRight } from 'lucide-react';

interface ListItem {
  id: string;
  desc: string;
  sub: string;
  value: number;
  date: string;
}

interface ActivityData {
  freights: ListItem[];
  orders: ListItem[];
  payments: ListItem[];
}

const ActivityFeed: React.FC<{ data: ActivityData }> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const ListPanel = ({ title, icon: Icon, items, colorClass }: any) => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <Icon size={18} className={colorClass} />
          {title}
        </div>
        <span className="text-xs font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-500">Últimos 5</span>
      </div>
      <div className="flex-1 overflow-auto">
        {items.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">Nenhum registro recente.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {items.map((item: ListItem) => (
              <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group cursor-pointer">
                <div>
                  <p className="font-bold text-slate-800 text-sm group-hover:text-primary-700">{item.desc}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{date(item.date)} • {item.sub}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-bold text-slate-700">{currency(item.value)}</p>
                  <ChevronRight size={14} className="ml-auto text-slate-300 group-hover:text-primary-500" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <ListPanel 
        title="Últimos Pedidos" 
        icon={FileText} 
        items={data.orders} 
        colorClass="text-blue-500"
      />
      <ListPanel 
        title="Últimos Fretes" 
        icon={Truck} 
        items={data.freights} 
        colorClass="text-amber-500"
      />
      <ListPanel 
        title="Últimos Pagamentos" 
        icon={DollarSign} 
        items={data.payments} 
        colorClass="text-emerald-500"
      />
    </div>
  );
};

export default ActivityFeed;
