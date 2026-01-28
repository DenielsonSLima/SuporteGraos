
import React, { useState, useEffect } from 'react';
import { Briefcase, CheckSquare, Square } from 'lucide-react';
import { PurchaseOrder } from '../../types';
import { Partner } from '../../../Partners/types';
import { PARTNER_CATEGORY_IDS } from '../../../../constants';

interface Props {
  data: Partial<PurchaseOrder>;
  partners: Partner[];
  onChange: (updates: Partial<PurchaseOrder>) => void;
}

const OrderBrokerSection: React.FC<Props> = ({ data, partners, onChange }) => {
  const brokers = partners.filter(p => p.categories.includes(PARTNER_CATEGORY_IDS.BROKER));
  const [displayComm, setDisplayComm] = useState('');

  const inputClass = 'block w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-slate-900 font-bold focus:border-blue-600 focus:outline-none transition-all';
  const labelClass = 'block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest ml-1';

  const handleCommChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = Number(raw) / 100;
    onChange({ brokerCommissionPerSc: num });
    setDisplayComm(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num));
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
        <h3 className="flex items-center gap-2 font-black text-slate-800 uppercase text-xs tracking-tighter">
          <div className="w-1 h-4 bg-violet-500 rounded-full"></div>
          3. Intermediação (Corretagem)
        </h3>
        <label className="flex items-center gap-2 cursor-pointer group select-none">
          <button type="button" onClick={() => onChange({ hasBroker: !data.hasBroker })} className={`p-1 rounded-lg transition-all ${data.hasBroker ? 'text-violet-600' : 'text-slate-300 hover:text-slate-400'}`}>
            {data.hasBroker ? <CheckSquare size={24} /> : <Square size={24} />}
          </button>
          <span className="text-xs font-black text-slate-500 uppercase tracking-tighter group-hover:text-slate-700 transition-colors">Venda com Corretor</span>
        </label>
      </div>

      {data.hasBroker && (
        <div className="grid gap-6 md:grid-cols-2 animate-in slide-in-from-top-2">
            <div>
              <label className={labelClass}>Corretor Parceiro</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                  value={data.brokerId || ''}
                  onChange={(e) => { const b = brokers.find(x => x.id === e.target.value); onChange({ brokerId: e.target.value, brokerName: b?.name || '' }); }}
                  className={`${inputClass} pl-12 appearance-none pr-10`}
                >
                  <option value="">Selecione...</option>
                  {brokers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Valor da Comissão (por Saca)</label>
              <input 
                type="text"
                value={displayComm}
                onChange={handleCommChange}
                placeholder="R$ 0,00"
                className={`${inputClass} text-violet-700 font-black`}
              />
            </div>
        </div>
      )}
    </div>
  );
};

export default OrderBrokerSection;
