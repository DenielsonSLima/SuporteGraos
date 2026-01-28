
import React from 'react';
import { Calendar } from 'lucide-react';

interface Props {
  filters: { startDate?: string; endDate?: string };
  onChange: (newFilters: any) => void;
}

const DefaultFilters: React.FC<Props & { carrierOptions?: string[] }> = ({ filters, onChange, carrierOptions = [] }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Data Inicial</label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white text-slate-900"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Data Final</label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white text-slate-900"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Transportadora</label>
        <select
          value={filters.carrierName || ''}
          onChange={e => onChange({ ...filters, carrierName: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white text-slate-900"
        >
          <option value="">Todas</option>
          {carrierOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default DefaultFilters;
