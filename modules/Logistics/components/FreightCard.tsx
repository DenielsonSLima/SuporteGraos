
import React from 'react';
import { Truck, MapPin, Calendar, DollarSign, User, AlertCircle } from 'lucide-react';
import { Freight, FreightStatus } from '../types';

interface Props {
  freight: Freight;
  onClick: (freight: Freight) => void;
  showFinancials?: boolean;
}

const statusConfig: Record<FreightStatus, { label: string; color: string }> = {
  scheduled: { label: 'Agendado', color: 'bg-slate-100 text-slate-600' },
  loaded: { label: 'Carregado', color: 'bg-blue-100 text-blue-700' },
  in_transit: { label: 'Em Trânsito', color: 'bg-indigo-100 text-indigo-700' },
  waiting_unload: { label: 'Aguard. Descarrego', color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Finalizado', color: 'bg-emerald-100 text-emerald-700' },
  canceled: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
  redirected: { label: 'Redirecionado', color: 'bg-orange-100 text-orange-700' },
};

const FreightCard: React.FC<Props> = ({ freight, onClick, showFinancials = false }) => {
  const status = statusConfig[freight.status];
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div 
      onClick={() => onClick(freight)}
      className="group bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all cursor-pointer hover:border-primary-200 flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-slate-50 text-slate-500">
            <Truck size={20} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 line-clamp-1">{freight.carrierName}</h4>
            <p className="text-xs text-slate-500 font-mono">{freight.vehiclePlate}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${status.color}`}>
          {status.label}
        </span>
      </div>

      {/* Route */}
      <div className="relative pl-3 border-l-2 border-slate-100 space-y-3 my-2">
        <div className="relative">
          <div className="absolute -left-[19px] top-1 h-3 w-3 rounded-full border-2 border-white bg-slate-300"></div>
          <p className="text-xs text-slate-400 uppercase">Origem</p>
          <p className="text-sm font-medium text-slate-700 truncate">{freight.originCity}/{freight.originState}</p>
        </div>
        <div className="relative">
          <div className="absolute -left-[19px] top-1 h-3 w-3 rounded-full border-2 border-white bg-primary-500"></div>
          <p className="text-xs text-slate-400 uppercase">Destino</p>
          <p className="text-sm font-medium text-slate-700 truncate">{freight.destinationCity}/{freight.destinationState}</p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-end">
        <div className="text-xs text-slate-500">
          <span className="block mb-0.5">{freight.product}</span>
          <span className="font-semibold text-slate-700">{freight.weight / 1000} TON</span>
        </div>
        
        {showFinancials ? (
          <div className="text-right">
            <p className="text-xs text-slate-400">Saldo a Pagar</p>
            <p className={`font-bold ${freight.balanceValue > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {currency(freight.balanceValue)}
            </p>
          </div>
        ) : (
          <div className="text-right">
            <p className="text-xs text-slate-400">Pedido</p>
            <p className="font-mono font-bold text-slate-700">{freight.orderNumber}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FreightCard;
