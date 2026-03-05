
import React from 'react';
import { Calendar, User, Hash, ChevronDown } from 'lucide-react';
import { PurchaseOrder } from '../../types';
import type { Shareholder } from '../../../../services/shareholderService';

interface Props {
  data: Partial<PurchaseOrder>;
  onChange: (field: keyof PurchaseOrder, value: any) => void;
  shareholders: Shareholder[]; 
}

const OrderGeneralInfo: React.FC<Props> = ({ data, onChange, shareholders }) => {
  const inputClass = 'block w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 py-2.5 text-slate-900 font-bold focus:border-blue-600 focus:outline-none transition-all';
  const labelClass = 'block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest ml-1';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 flex items-center gap-2 font-black text-slate-800 uppercase text-xs tracking-tighter">
        <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
        1. Identificação do Pedido
      </h3>
      <div className="grid gap-6 md:grid-cols-3">
        
        <div>
          <label className={labelClass}>Nº Identificador</label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              disabled
              value={data.number}
              className={`${inputClass} bg-slate-50 text-slate-500 cursor-not-allowed border-dashed`}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Data da Negociação</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              type="date" 
              required
              value={data.date?.toString().split('T')[0]}
              onChange={e => onChange('date', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Consultor (Sócio Comprador)</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select 
              required
              value={data.consultantName}
              onChange={e => onChange('consultantName', e.target.value)}
              className={`${inputClass} appearance-none pr-10`}
            >
              <option value="">Selecione...</option>
              {shareholders.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

      </div>
    </div>
  );
};

export default OrderGeneralInfo;
